import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';


import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CreditCard, ShoppingBag, Store, Truck, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../../lib/api';
import { DISTRICTS, mnt } from '../../lib/format';
import type { Order, Payment } from '../../lib/types';

import { cartTotals, lineTotal, useCart, useCartLines } from '../../store/cart';
import { useMember } from '../../store/auth';
import { useTenant } from '../../layouts/StorefrontLayout';
import { Button, Card, EmptyState, Field, Input, Page, Select, Textarea } from '../../components/ui';
import { cn } from '../../lib/cn';

/**
 * Хүргэлтийн үед л хаяг шаардана. Очиж авахад тэр талбарууд харагдахгүй тул
 * баталгаажуулалтыг ч алгасана — сервер мөн адил шалгана.
 */
const makeSchema = (type: 'DELIVERY' | 'PICKUP') =>
  z.object({
    customerName: z.string().min(2, 'Нэрээ оруулна уу'),
    customerPhone: z.string().regex(/^\d{8}$/, 'Утасны дугаар 8 оронтой тоо байна'),
    district:
      type === 'DELIVERY' ? z.string().min(1, 'Дүүрэг сонгоно уу') : z.string().optional(),
    addressLine:
      type === 'DELIVERY'
        ? z.string().min(4, 'Хаягаа дэлгэрэнгүй бичнэ үү')
        : z.string().optional(),
    note: z.string().max(300).optional(),
  });

type FormValues = {
  customerName: string;
  customerPhone: string;
  district?: string;
  addressLine?: string;
  note?: string;
};

export function Checkout() {
  const { slug = '' } = useParams();
  const tenant = useTenant();
  const navigate = useNavigate();
  const { user } = useMember(slug);
  const lines = useCartLines(slug);
  const clear = useCart((s) => s.clear);
  const { subtotal, count } = cartTotals(lines);
  const [method, setMethod] = useState<'CASH' | 'QPAY' | 'STRIPE' | 'WIRE'>('STRIPE');


  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);

  // Ресторан хүргэлт хийдэггүй бол шууд очиж авах горимд эхэлнэ.
  const [type, setType] = useState<'DELIVERY' | 'PICKUP'>(
    tenant.deliveryEnabled ? 'DELIVERY' : 'PICKUP',
  );
  const bothAvailable = tenant.deliveryEnabled && tenant.pickupEnabled;
  const deliveryFee = type === 'DELIVERY' ? tenant.deliveryFee : 0;


  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(makeSchema(type)),
    defaultValues: {
      customerName: user?.name ?? '',
      customerPhone: user?.phone ?? '',
      district: DISTRICTS[0],
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { order } = await api<{ order: Order }>('/orders', {
        method: 'POST',
        body: {
          ...values,
          type,
          // Очиж авах үед хаяг илгээхгүй — сервер ч хүлээж авахгүй.
          district: type === 'DELIVERY' ? values.district : undefined,
          addressLine: type === 'DELIVERY' ? values.addressLine : undefined,
          deliveryLat: type === 'DELIVERY' ? point?.latitude : undefined,
          deliveryLng: type === 'DELIVERY' ? point?.longitude : undefined,
          paymentMethod: method,
          items: lines.map((l) => ({
            menuItemId: l.menuItemId,
            quantity: l.quantity,
            optionIds: l.options.map((o) => o.id),
          })),
        },
      });

      if (method === 'CASH') return { order, payment: null };

      // Дүнг энд явуулахгүй — сервер захиалгаасаа уншина.
      const { payment } = await api<{ payment: Payment }>('/payments/create', {
        method: 'POST',
        body: { orderId: order.id, provider: method },
      });
      return { order, payment };
    },
    onSuccess: ({ order, payment }) => {
      clear(slug);
      if (payment) {
        navigate(`/t/${slug}/pay/${payment.id}`, { replace: true });
        return;
      }
      toast.success('Захиалга амжилттай!');
      navigate(`/t/${slug}/order/${order.trackToken}`, { replace: true });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof ApiError ? e.message : 'Захиалга үүсгэхэд алдаа гарлаа');
    },
  });

  if (count === 0) {
    return (
      <Page>
        <EmptyState
          icon={<ShoppingBag size={30} strokeWidth={1.5} />}
          title="Сагс хоосон байна"
          description="Эхлээд цэснээс хоол сонгоно уу."
          action={<Button onClick={() => navigate(`/t/${slug}/menu`)}>Цэс үзэх</Button>}
        />
      </Page>
    );
  }

  return (
    <Page className="mx-auto max-w-2xl px-5 pt-8 sm:px-8">
      {/* Бусад дэд хуудсуудтай ижил буцах холбоос. */}
      <Link
        to={`/t/${slug}/menu`}
        className="group inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
        {tenant.name} — цэс рүү
      </Link>

      <h1 className="mt-4 text-[28px] font-semibold tracking-[-0.03em]">
        Захиалга баталгаажуулах
      </h1>
      <p className="mt-1 text-muted">{tenant.name} — {tenant.etaMinutes} минутын дотор</p>

      {/* Хүргэлтгүй ресторанд үүнийг тодорхой хэлнэ. */}
      {!tenant.deliveryEnabled && (
        <Card className="mt-6 flex items-start gap-3 border-dashed p-5">
          <Store size={18} className="mt-0.5 shrink-0 text-muted" />
          <div className="text-[14px]">
            <p className="font-medium">Энэ ресторан хүргэлтийн үйлчилгээ үзүүлдэггүй.</p>
            <p className="mt-1 text-muted">
              Захиалгаа {tenant.address ?? tenant.name} хаягаас өөрөө авна.
            </p>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="mt-7 space-y-7">
        {/* Хоёулаа боломжтой үед л сонголт харуулна. */}
        {bothAvailable && (
          <section className="space-y-3">
            <h2 className="text-[16px] font-semibold">Хүлээн авах хэлбэр</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <PayOption
                active={type === 'DELIVERY'}
                onClick={() => setType('DELIVERY')}
                icon={<Truck size={17} />}
                title="Хүргэлтээр"
                subtitle={`${mnt(tenant.deliveryFee)} · ${tenant.etaMinutes} мин`}
              />
              <PayOption
                active={type === 'PICKUP'}
                onClick={() => setType('PICKUP')}
                icon={<Store size={17} />}
                title="Өөрөө авах"
                subtitle="Хүргэлтийн төлбөргүй"
              />
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-[16px] font-semibold">Хүлээн авагч</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Нэр" error={errors.customerName?.message}>
              <Input placeholder="Батбаяр" {...register('customerName')} />
            </Field>
            <Field label="Утас" error={errors.customerPhone?.message}>
              <Input placeholder="99112233" inputMode="numeric" {...register('customerPhone')} />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          {/* Хаягийн хэсэг зөвхөн хүргэлтэд харагдана. */}
          {type === 'DELIVERY' ? (
            <>
              <h2 className="text-[16px] font-semibold">Хүргэлтийн хаяг</h2>
              <Field label="Дүүрэг" error={errors.district?.message}>
                <Select {...register('district')}>
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Дэлгэрэнгүй хаяг" error={errors.addressLine?.message}>
                <Input placeholder="12-р хороо, 45-р байр, 12 тоот" {...register('addressLine')} />
              </Field>
              <div>
                <Button type="button" variant="secondary" onClick={() => navigator.geolocation?.getCurrentPosition((p) => { setPoint({ latitude: p.coords.latitude, longitude: p.coords.longitude }); toast.success('Газрын зурагт хүргэх цэг сонгогдлоо'); }, () => toast.error('Байршил авах зөвшөөрөл хэрэгтэй'))}>Одоогийн байршлыг хүргэх цэг болгох</Button>
                <p className="mt-2 text-xs text-muted">{point ? `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}` : 'Хүргэх цэг сонгоогүй'}</p>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-[16px] font-semibold">Авах газар</h2>
              <Card className="flex items-start gap-3 p-4">
                <Store size={17} className="mt-0.5 shrink-0 text-muted" />
                <div className="text-[14px]">
                  <p className="font-medium">{tenant.name}</p>
                  {tenant.address && <p className="mt-0.5 text-muted">{tenant.address}</p>}
                  <p className="mt-0.5 text-muted">
                    {tenant.openTime}—{tenant.closeTime}
                    {tenant.phone ? ` · ${tenant.phone}` : ''}
                  </p>
                </div>
              </Card>
            </>
          )}

          <Field label="Нэмэлт тэмдэглэл" hint="Заавал биш" error={errors.note?.message}>
            <Textarea placeholder="Хаалганы код, давхар, онцгой хүсэлт..." {...register('note')} />
          </Field>
        </section>

        <section className="space-y-3">
          <h2 className="text-[16px] font-semibold">Төлбөрийн хэлбэр</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <PayOption
              active={method === 'STRIPE'}
              onClick={() => setMethod('STRIPE')}
              icon={<CreditCard size={17} />}
              title="Stripe Онлайн Төлбөр"
              subtitle="Visa · Mastercard · Карт"
            />
            <PayOption
              active={method === 'CASH'}
              onClick={() => setMethod('CASH')}
              icon={<Wallet size={17} />}
              title="Бэлнээр"
              subtitle={type === 'PICKUP' ? 'Авахдаа төлнө' : 'Хүргэлтийн үед төлнө'}
            />
          </div>

        </section>


        {/* Захиалгын хураангуй */}
        <Card className="p-5">
          <h2 className="mb-3 text-[16px] font-semibold">Захиалга</h2>
          <ul className="space-y-2.5 text-[14px]">
            {lines.map((l) => (
              <li key={l.key} className="flex justify-between gap-4">
                <span className="min-w-0">
                  <span className="text-muted">{l.quantity}×</span> {l.name}
                  {l.options.length > 0 && (
                    <span className="block text-[12.5px] text-faint">
                      {l.options.map((o) => o.name).join(', ')}
                    </span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums">{mnt(lineTotal(l))}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1.5 border-t border-line pt-4 text-[14px]">
            <div className="flex justify-between text-muted">
              <span>Дүн</span>
              <span className="tabular-nums">{mnt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>{type === 'DELIVERY' ? 'Хүргэлт' : 'Өөрөө авах'}</span>
              <span className="tabular-nums">{deliveryFee ? mnt(deliveryFee) : 'үнэгүй'}</span>
            </div>
            <div className="flex justify-between pt-1.5 text-[16px] font-semibold">
              <span>Нийт</span>
              <span className="tabular-nums">{mnt(subtotal + deliveryFee)}</span>
            </div>
          </div>
        </Card>

        <Button type="submit" full size="lg" loading={mutation.isPending}>
          Захиалга өгөх · {mnt(subtotal + deliveryFee)}
        </Button>
      </form>
    </Page>
  );
}

function PayOption({
  active,
  onClick,
  icon,
  title,
  subtitle,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-[12px] border px-4 py-3.5 text-left transition-all duration-150',
        active ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong',
        disabled && 'opacity-55',
      )}
    >
      <span className={cn('shrink-0', active ? 'text-accent' : 'text-muted')}>{icon}</span>
      <span>
        <span className="block text-[14.5px] font-medium">{title}</span>
        <span className="block text-[12.5px] text-muted">{subtitle}</span>
      </span>
    </button>
  );
}
