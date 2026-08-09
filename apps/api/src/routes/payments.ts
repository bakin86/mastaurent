import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { stripeConfigured } from '../env.js';
import { asyncHandler, badRequest, notFound } from '../lib/http.js';
import { orderLimiter } from '../lib/rateLimit.js';
import { optionalMember } from '../middleware/auth.js';
import { resolveTenant } from '../middleware/tenant.js';
import {
  availableProviders,
  createPayment,
  markPaid,
  orderRefOf,
  publicPayment,
  syncQpay,
} from '../payments/service.js';
import { verifyWebhook } from '../payments/stripe.js';

export const paymentsRouter = Router();

/** Аль төлбөрийн хэрэгсэл идэвхтэй байгааг frontend мэдэх хэрэгтэй. */
paymentsRouter.get('/providers', (_req, res) => res.json(availableProviders()));

const createSchema = z.object({
  orderId: z.string().min(1, 'Захиалга заагаагүй байна'),
  provider: z.enum(['QPAY', 'STRIPE']),
});

/**
 * Төлбөр эхлүүлэх. Дүн нь захиалгаас уншигдана — биед дүн явуулах
 * боломжгүй бөгөөд явуулсан ч үл тоомсорлоно.
 */
paymentsRouter.post(
  '/create',
  orderLimiter,
  resolveTenant,
  optionalMember,
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const payment = await createPayment(body.orderId, req.tenantId!, body.provider);
    res.status(201).json({ payment: publicPayment(payment, await orderRefOf(payment.orderId)) });
  }),
);

/**
 * Төлбөрийн төлөв. QPay бол эх сурвалжаас нь дахин шалгана —
 * банкны апп дуусмагц энэ хүсэлт л үнэнийг хэлнэ.
 */
paymentsRouter.get(
  '/:id',
  resolveTenant,
  asyncHandler(async (req, res) => {
    const found = await prisma.payment.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId! },
    });
    if (!found) throw notFound('Төлбөр олдсонгүй');

    const payment = found.provider === 'QPAY' ? await syncQpay(found) : found;
    res.json({ payment: publicPayment(payment, await orderRefOf(payment.orderId)) });
  }),
);

/**
 * QPay callback. Биед нь итгэхгүй — зөвхөн "шалгаарай" гэсэн дохио
 * гэж үзээд payment/check API-аар баталгаажуулна.
 */
const qpayCallback = asyncHandler(async (req, res) => {
  const paymentId = (req.query.payment as string | undefined) ?? '';
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw notFound('Төлбөр олдсонгүй');

  await syncQpay(payment);
  res.json({ ok: true });
});

paymentsRouter.get('/qpay/callback', qpayCallback);
paymentsRouter.post('/qpay/callback', qpayCallback);

/**
 * Stripe webhook. Гарын үсгээр баталгаажуулна — index.ts дээр энэ зам
 * түүхий биетэйгээр (express.raw) ирдэг.
 */
paymentsRouter.post(
  '/stripe/webhook',
  asyncHandler(async (req, res) => {
    if (!stripeConfigured) throw badRequest('Stripe тохируулаагүй байна');

    const signature = req.headers['stripe-signature'];
    if (typeof signature !== 'string') throw badRequest('Гарын үсэг алга');
    if (!Buffer.isBuffer(req.body)) throw badRequest('Түүхий бие шаардлагатай');

    let event;
    try {
      event = verifyWebhook(req.body, signature);
    } catch {
      // Гарын үсэг таарахгүй бол хуурамч хүсэлт.
      throw badRequest('Гарын үсэг буруу байна');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        client_reference_id?: string | null;
        payment_status?: string;
        payment_intent?: string | null;
      };
      const paymentId = session.client_reference_id;
      if (paymentId && session.payment_status === 'paid') {
        await markPaid(paymentId, session.payment_intent ?? null);
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as { client_reference_id?: string | null };
      if (session.client_reference_id) {
        await prisma.payment.updateMany({
          where: { id: session.client_reference_id, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
      }
    }

    res.json({ received: true });
  }),
);
