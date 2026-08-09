import type { Payment, PaymentProvider } from '@prisma/client';
import { prisma } from '../db.js';
import { PAYMENT_SETUP_HINT, env, qpayConfigured, stripeConfigured } from '../env.js';
import { HttpError, badRequest, notFound } from '../lib/http.js';
import * as qpay from './qpay.js';
import * as stripe from './stripe.js';

/** Клиент рүү буцаах хэлбэр — дотоод талбаруудыг задлахгүй. */
export function publicPayment(p: Payment, order?: { orderNo: number; trackToken: string } | null) {
  return {
    id: p.id,
    provider: p.provider,
    status: p.status,
    amount: p.amount,
    currency: p.currency,
    invoiceId: p.invoiceId,
    checkoutUrl: p.paymentUrl,
    qrText: p.qrText,
    qrImage: p.qrImage,
    paidAt: p.paidAt,
    // Зочин хэрэглэгч төлсний дараа захиалгаа хянах холбоос — нэвтрэлт шаардахгүй.
    orderNo: order?.orderNo ?? null,
    trackToken: order?.trackToken ?? null,
  };
}

/** Хянах холбоос гаргахад хэрэгтэй захиалгын талбарууд. */
export function orderRefOf(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNo: true, trackToken: true },
  });
}

export function assertProviderReady(provider: PaymentProvider) {
  if (provider === 'QPAY' && !qpayConfigured) throw new HttpError(503, PAYMENT_SETUP_HINT);
  if (provider === 'STRIPE' && !stripeConfigured) throw new HttpError(503, PAYMENT_SETUP_HINT);
}

/**
 * Захиалгад төлбөр үүсгэнэ.
 *
 * Дүнг ЗӨВХӨН захиалгаас уншина — клиентээс ирсэн ямар ч дүнд итгэхгүй.
 * Нэг захиалгад хүлээгдэж буй төлбөр аль хэдийн байвал түүнийг дахин
 * ашиглана (хэрэглэгч товчоо дахин дарахад шинэ нэхэмжлэх үүсгэхгүй).
 */
export async function createPayment(orderId: string, tenantId: string, provider: PaymentProvider) {
  // Захиалга энэ ресторных мөн эсэхийг ЭХЛЭЭД шалгана — тохиргооны
  // төлөв ямар ч байсан өөр tenant-ийн захиалга руу хандах боломжгүй.
  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: {
      id: true,
      orderNo: true,
      total: true,
      isPaid: true,
      userId: true,
      customerPhone: true,
      tenant: { select: { slug: true } },
    },
  });
  if (!order) throw notFound('Захиалга олдсонгүй');
  if (order.isPaid) throw badRequest('Энэ захиалга аль хэдийн төлөгдсөн байна');

  assertProviderReady(provider);

  const existing = await prisma.payment.findFirst({
    where: { orderId: order.id, provider, status: 'PENDING' },
  });
  if (existing) return existing;

  const payment = await prisma.payment.create({
    data: {
      tenantId,
      orderId: order.id,
      userId: order.userId,
      provider,
      amount: order.total,
      currency: provider === 'STRIPE' ? env.stripe.currency.toUpperCase() : 'MNT',
    },
  });

  try {
    return provider === 'QPAY'
      ? await startQpay(payment, order.orderNo, order.customerPhone)
      : await startStripe(payment, order.orderNo, order.tenant.slug);
  } catch (e) {
    // Provider дуудлага унасан бол мөрийг тэнэгээр PENDING-д үлдээхгүй.
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    throw e;
  }
}

async function startQpay(payment: Payment, orderNo: number, phone: string) {
  const invoice = await qpay.createInvoice({
    paymentId: payment.id,
    amount: payment.amount,
    description: `Захиалга #${orderNo}`,
    receiverCode: phone,
    callbackUrl: `${env.publicApiUrl}/api/payments/qpay/callback?payment=${payment.id}`,
  });

  return prisma.payment.update({
    where: { id: payment.id },
    data: {
      invoiceId: invoice.invoice_id,
      qrText: invoice.qr_text ?? null,
      qrImage: invoice.qr_image ?? null,
      paymentUrl: invoice.qPay_shortUrl ?? null,
    },
  });
}

async function startStripe(payment: Payment, orderNo: number, slug: string) {
  const back = `${env.webOrigin}/t/${slug}/pay/${payment.id}`;
  const session = await stripe.createCheckoutSession({
    paymentId: payment.id,
    amount: payment.amount,
    description: `Захиалга #${orderNo}`,
    successUrl: `${back}?done=1`,
    cancelUrl: `${back}?cancelled=1`,
  });

  return prisma.payment.update({
    where: { id: payment.id },
    data: { invoiceId: session.id, paymentUrl: session.url ?? null },
  });
}

/**
 * Төлбөрийг төлөгдсөнд тооцно. Идемпотент — webhook болон polling
 * зэрэг ирсэн ч захиалга нэг л удаа төлөгдсөн болно.
 */
export async function markPaid(paymentId: string, transactionId: string | null) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw notFound('Төлбөр олдсонгүй');
  if (payment.status === 'PAID') return payment;

  return prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: paymentId, status: 'PENDING' },
      data: { status: 'PAID', transactionId, paidAt: new Date() },
    });
    if (!claimed.count) return tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    await tx.order.update({ where: { id: payment.orderId }, data: { isPaid: true } });
    return tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
  });
}

/**
 * QPay-гийн төлөвийг эх сурвалжаас нь шалгана.
 * Хэрэглэгчийн браузераас ирсэн мэдээлэлд огт найдахгүй.
 */
export async function syncQpay(payment: Payment): Promise<Payment> {
  if (payment.status === 'PAID' || !payment.invoiceId) return payment;

  const result = await qpay.checkPayment(payment.invoiceId);
  const paidRow = result.rows?.find((r) => r.payment_status?.toUpperCase() === 'PAID');

  // Дүн дутуу төлөгдсөн бол төлөгдсөнд тооцохгүй.
  if (!paidRow || (result.paid_amount ?? 0) < payment.amount) return payment;

  return markPaid(payment.id, paidRow.payment_id ?? null);
}

/** Аль provider бэлэн байгааг клиентэд мэдэгдэнэ. */
export const availableProviders = () => ({
  qpay: qpayConfigured,
  stripe: stripeConfigured,
});
