import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler, badRequest, notFound } from '../lib/http.js';
import { requireRole, requireStaff } from '../middleware/auth.js';

export const staffRouter = Router();
const STAFF_ROLES = ['MANAGER', 'KITCHEN', 'DRIVER'] as const;
const select = { id: true, name: true, email: true, phone: true, role: true, isActive: true, isOnline: true, currentLat: true, currentLng: true, lastPingAt: true, createdAt: true } as const;

staffRouter.get('/', requireStaff, requireRole('DIRECTOR', 'MANAGER'), asyncHandler(async (req, res) => {
  const staff = await prisma.user.findMany({
    where: { tenantId: req.tenantId!, role: { not: 'USER' } },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    select,
  });
  res.json({ staff });
}));

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(STAFF_ROLES),
});

staffRouter.post('/', requireStaff, requireRole('DIRECTOR'), asyncHandler(async (req, res) => {
  const body = createSchema.parse(req.body);
  const account = await prisma.account.findUnique({ where: { email: body.email } });
  if (!account) throw badRequest('Энэ и-мэйлтэй хэрэглэгч эхлээд системд бүртгүүлсэн байх ёстой');
  const member = await prisma.user.upsert({
    where: { tenantId_accountId: { tenantId: req.tenantId!, accountId: account.id } },
    update: { role: body.role, isActive: true },
    create: {
      tenantId: req.tenantId!, accountId: account.id, name: account.name,
      email: account.email, phone: account.phone, role: body.role,
    },
    select,
  });
  res.status(201).json({ staff: member });
}));

const updateSchema = z.object({ role: z.enum(STAFF_ROLES).optional(), isActive: z.boolean().optional() });
staffRouter.patch('/:id', requireStaff, requireRole('DIRECTOR'), asyncHandler(async (req, res) => {
  const data = updateSchema.parse(req.body);
  const current = await prisma.user.findFirst({ where: { id: req.params.id, tenantId: req.tenantId! } });
  if (!current) throw notFound('Ажилтан олдсонгүй');
  if (current.role === 'DIRECTOR') throw badRequest('Захирлын эрхийг эндээс өөрчлөх боломжгүй');
  const staff = await prisma.user.update({ where: { id: current.id }, data, select });
  res.json({ staff });
}));
