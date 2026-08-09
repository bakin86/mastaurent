import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler, badRequest, notFound } from '../lib/http.js';
import { requireAccount, requirePlatformAdmin } from '../middleware/auth.js';

/**
 * Ресторан нээх хүсэлтийн урсгал.
 *
 *   хэрэглэгч хүсэлт илгээнэ  →  платформын админ хянана
 *        →  зөвшөөрвөл: Tenant үүсч, хүсэлт гаргагч нь OWNER болно
 *        →  татгалзвал: шалтгаантайгаар буцна
 */
export const requestsRouter = Router();

const publicRequest = {
  id: true,
  name: true,
  slug: true,
  category: true,
  tagline: true,
  description: true,
  phone: true,
  email: true,
  address: true,
  openTime: true,
  closeTime: true,
  logoUrl: true,
  coverUrl: true,
  accentColor: true,
  note: true,
  status: true,
  reviewNote: true,
  reviewedAt: true,
  tenantId: true,
  createdAt: true,
} as const;

const withAccount = {
  ...publicRequest,
  account: { select: { id: true, name: true, email: true, phone: true } },
} as const;

const createSchema = z.object({
  name: z.string().min(2, 'Рестораны нэр хамгийн багадаа 2 тэмдэгт').max(80),
  slug: z
    .string()
    .min(3, 'Хаяг хамгийн багадаа 3 тэмдэгт')
    .max(40)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Хаяг зөвхөн жижиг латин үсэг, тоо, зураасаас тогтоно'),
  category: z.string().max(60).optional(),
  tagline: z.string().max(160).optional(),
  description: z.string().max(1000).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email('И-мэйл буруу байна').optional().or(z.literal('')),
  address: z.string().max(200).optional(),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, 'Цаг HH:MM хэлбэртэй').default('09:00'),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, 'Цаг HH:MM хэлбэртэй').default('22:00'),
  logoUrl: z.string().max(600).optional().or(z.literal('')),
  coverUrl: z.string().max(600).optional().or(z.literal('')),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Өнгө #RRGGBB хэлбэртэй байна')
    .default('#0A0A0A'),
  note: z.string().max(600).optional(),
});

/** Хаяг чөлөөтэй эсэх — одоо байгаа ресторан болон хүлээгдэж буй хүсэлтээс. */
async function assertSlugFree(slug: string, exceptRequestId?: string) {
  const taken = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (taken) throw badRequest('Энэ хаяг аль хэдийн ашиглагдаж байна');

  const pending = await prisma.restaurantRequest.findFirst({
    where: { slug, status: 'PENDING', ...(exceptRequestId ? { id: { not: exceptRequestId } } : {}) },
    select: { id: true },
  });
  if (pending) throw badRequest('Энэ хаягаар хүсэлт аль хэдийн илгээгдсэн байна');
}

// --- Хэрэглэгчийн тал ---------------------------------------------------------

/** Ресторан шууд үүсгэх. Request мөр нь audit түүх болж APPROVED төлөвтэй хадгалагдана. */
requestsRouter.post(
  '/',
  requireAccount,
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const accountId = req.account!.id;

    const owned = await prisma.user.findFirst({
      where: { accountId, role: 'DIRECTOR', isActive: true },
      select: { id: true },
    });
    if (owned) throw badRequest('Та аль хэдийн ресторантай байна');

    await assertSlugFree(body.slug);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: body.slug, name: body.name, category: body.category,
          tagline: body.tagline, description: body.description, phone: body.phone,
          address: body.address, openTime: body.openTime, closeTime: body.closeTime,
          logoUrl: body.logoUrl, coverUrl: body.coverUrl, accentColor: body.accentColor,
        },
      });
      await tx.user.create({
        data: {
          tenantId: tenant.id, accountId, name: req.account!.name,
          email: req.account!.email, phone: req.account!.phone, role: 'DIRECTOR',
        },
      });
      const request = await tx.restaurantRequest.create({
        data: {
          ...body, accountId, status: 'APPROVED', tenantId: tenant.id,
          reviewedAt: new Date(), reviewNote: 'Автоматаар үүссэн',
        },
        select: publicRequest,
      });
      return { tenant, request };
    });
    res.status(201).json({ request: result.request, tenant: { id: result.tenant.id, slug: result.tenant.slug, name: result.tenant.name } });
  }),
);

/** Өөрийн хүсэлтүүд. */
requestsRouter.get(
  '/mine',
  requireAccount,
  asyncHandler(async (req, res) => {
    const requests = await prisma.restaurantRequest.findMany({
      where: { accountId: req.account!.id },
      orderBy: { createdAt: 'desc' },
      select: publicRequest,
    });
    res.json({ requests });
  }),
);

// --- Платформын админ ---------------------------------------------------------

const listQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ALL']).optional(),
});

requestsRouter.get(
  '/',
  requirePlatformAdmin,
  asyncHandler(async (req, res) => {
    const { status } = listQuerySchema.parse(req.query);
    const requests = await prisma.restaurantRequest.findMany({
      where: status && status !== 'ALL' ? { status } : {},
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
      select: withAccount,
    });
    res.json({ requests });
  }),
);

/**
 * Зөвшөөрөх — ресторан үүсгээд хүсэлт гаргагчийг OWNER болгоно.
 * Бүх алхам нэг transaction дотор: аль нэг нь унавал юу ч үлдэхгүй.
 */
requestsRouter.post(
  '/:id/approve',
  requirePlatformAdmin,
  asyncHandler(async (req, res) => {
    const request = await prisma.restaurantRequest.findUnique({
      where: { id: req.params.id },
      include: { account: { select: { id: true, name: true, email: true, phone: true } } },
    });
    if (!request) throw notFound('Хүсэлт олдсонгүй');
    if (request.status !== 'PENDING') throw badRequest('Энэ хүсэлт аль хэдийн хянагдсан байна');

    // Хүсэлт илгээснээс хойш хаяг эзэлэгдсэн байж болно.
    await assertSlugFree(request.slug, request.id);

    const tenant = await prisma.$transaction(async (tx) => {
      const created = await tx.tenant.create({
        data: {
          slug: request.slug,
          name: request.name,
          category: request.category,
          tagline: request.tagline,
          description: request.description,
          phone: request.phone,
          address: request.address,
          openTime: request.openTime,
          closeTime: request.closeTime,
          logoUrl: request.logoUrl,
          coverUrl: request.coverUrl,
          accentColor: request.accentColor,
        },
      });

      // Хүсэлт гаргагч нь шинэ рестораны эзэн болно.
      await tx.user.create({
        data: {
          tenantId: created.id,
          accountId: request.accountId,
          name: request.account.name,
          email: request.account.email,
          phone: request.account.phone,
          role: 'DIRECTOR',
        },
      });

      await tx.restaurantRequest.update({
        where: { id: request.id },
        data: { status: 'APPROVED', tenantId: created.id, reviewedAt: new Date() },
      });

      return created;
    });

    res.json({ tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name } });
  }),
);

const rejectSchema = z.object({
  reviewNote: z.string().min(3, 'Шалтгаанаа бичнэ үү').max(600),
});

requestsRouter.post(
  '/:id/reject',
  requirePlatformAdmin,
  asyncHandler(async (req, res) => {
    const { reviewNote } = rejectSchema.parse(req.body);

    const { count } = await prisma.restaurantRequest.updateMany({
      where: { id: req.params.id, status: 'PENDING' },
      data: { status: 'REJECTED', reviewNote, reviewedAt: new Date() },
    });
    if (!count) throw notFound('Хянагдаагүй хүсэлт олдсонгүй');

    const request = await prisma.restaurantRequest.findUnique({
      where: { id: req.params.id },
      select: publicRequest,
    });
    res.json({ request });
  }),
);
