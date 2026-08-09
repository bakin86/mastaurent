import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CircleCheck, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '../lib/api';
import type { RestaurantRequest as Request } from '../lib/types';
import { useAccount } from '../store/auth';
import { Button, Card, Field, Input, Page, Select, Skeleton, Textarea } from '../components/ui';

/**
 * Ресторан шууд үүсгэх.
 *
 * USER маягт бөглөнө → ресторан шууд үүснэ → USER нь DIRECTOR болно.
 */

const schema = z.object({
  name: z.string().min(2, 'Рестораны нэрээ оруулна уу'),
  slug: z
    .string()
    .min(3, 'Хамгийн багадаа 3 тэмдэгт')
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Зөвхөн жижиг латин үсэг, тоо, зураас'),
  category: z.string().max(60).optional(),
  tagline: z.string().max(160).optional(),
  description: z.string().max(1000).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email('И-мэйл буруу байна').optional().or(z.literal('')),
  address: z.string().max(200).optional(),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, 'Цаг HH:MM хэлбэртэй'),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, 'Цаг HH:MM хэлбэртэй'),
  logoUrl: z.string().max(600).optional().or(z.literal('')),
  note: z.string().max(600).optional(),
});

/** Түгээмэл ангиллууд — сонгоход хялбар. */
const CATEGORIES = [
  'Монгол хоол',
  'Түргэн хоол',
  'Итали',
  'Япон',
  'Солонгос',
  'Хятад',
  'Кафе, амттан',
  'Бусад',
];

type Values = z.infer<typeof schema>;

export function RestaurantRequestPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { account, ready, isSignedIn } = useAccount();

  const { data, isLoading } = useQuery({
    queryKey: ['my-requests'],
    queryFn: () => api<{ requests: Request[] }>('/restaurant-requests/mine'),
    enabled: ready && isSignedIn,
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { openTime: '09:00', closeTime: '22:00' },
  });

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      api<{ request: Request; tenant: { slug: string } }>('/restaurant-requests', { method: 'POST', body: values }),
    onSuccess: ({ tenant }) => {
      toast.success('Ресторан амжилттай үүслээ');
      void queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['staff-me'] });
      void queryClient.invalidateQueries({ queryKey: ['tenants'] });
      navigate(`/t/${tenant.slug}`);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof ApiError ? e.message : 'Ресторан үүсгэхэд алдаа гарлаа'),
  });

  if (ready && !isSignedIn) {
    return (
      <Shell>
        <Card className="p-6 text-[14px] text-muted">
          <p className="font-medium text-ink">Эхлээд нэвтэрнэ үү.</p>
          <p className="mt-2">Ресторан үүсгэхийн тулд USER бүртгэлтэй байх шаардлагатай.</p>
          <div className="mt-5 flex gap-2">
            <Button onClick={() => navigate('/login')}>Нэвтрэх</Button>
            <Button variant="secondary" onClick={() => navigate('/register')}>
              Бүртгүүлэх
            </Button>
          </div>
        </Card>
      </Shell>
    );
  }

  const requests = data?.requests ?? [];
  const pending = requests.find((r) => r.status === 'PENDING');

  return (
    <Shell>
      {isLoading ? (
        <Skeleton className="h-32" />
      ) : (
        <>
          {requests.length > 0 && (
            <ul className="mb-8 space-y-3">
              {requests.map((r) => (
                <li key={r.id}>
                  <RequestCard request={r} />
                </li>
              ))}
            </ul>
          )}

          {pending ? (
            <p className="text-[14px] text-muted">
              Хүсэлт тань хянагдаж байна. Хариу гармагц энд харагдана.
            </p>
          ) : (
            <form
              onSubmit={handleSubmit((v) => mutation.mutate(v))}
              className="space-y-4"
            >
              <Field label="Рестораны нэр" error={errors.name?.message}>
                <Input
                  placeholder="Болдын Хоолны Газар"
                  {...register('name', {
                    onChange: (e) => {
                      // Нэрнээс хаягийг автоматаар санал болгоно.
                      const auto = e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '');
                      if (auto) setValue('slug', auto, { shouldValidate: false });
                    },
                  })}
                />
              </Field>

              <Field
                label="Хаяг (URL)"
                hint="Дэлгүүрийн хаяг ийм болно: /t/<хаяг>"
                error={errors.slug?.message}
              >
                <Input placeholder="bold-hool" {...register('slug')} />
              </Field>

              <Field label="Төрөл / ангилал" error={errors.category?.message}>
                <Select {...register('category')}>
                  <option value="">Сонгоно уу</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Товч тайлбар" error={errors.tagline?.message}>
                <Input placeholder="Гэрийн амттай хоол" {...register('tagline')} />
              </Field>

              <Field label="Дэлгэрэнгүй тайлбар" hint="Заавал биш" error={errors.description?.message}>
                <Textarea placeholder="Рестораны түүх, онцлог..." {...register('description')} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Утас" error={errors.phone?.message}>
                  <Input placeholder="9911-2233" {...register('phone')} />
                </Field>
                <Field label="И-мэйл" error={errors.email?.message}>
                  <Input type="email" placeholder="info@resto.mn" {...register('email')} />
                </Field>
              </div>

              <Field label="Хаяг" error={errors.address?.message}>
                <Input placeholder="СБД, 5-р хороо" {...register('address')} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Нээх цаг" error={errors.openTime?.message}>
                  <Input type="time" {...register('openTime')} />
                </Field>
                <Field label="Хаах цаг" error={errors.closeTime?.message}>
                  <Input type="time" {...register('closeTime')} />
                </Field>
              </div>

              <Field label="Лого (зургийн URL)" hint="Заавал биш" error={errors.logoUrl?.message}>
                <Input placeholder="https://..." {...register('logoUrl')} />
              </Field>

              <Field label="Нэмэлт тэмдэглэл" hint="Заавал биш" error={errors.note?.message}>
                <Textarea placeholder="Рестораны тухай товч танилцуулга..." {...register('note')} />
              </Field>

              <Button type="submit" full size="lg" loading={mutation.isPending}>
                Ресторан үүсгэх
              </Button>

              <p className="text-center text-[12.5px] text-faint">
                {account?.email} нэрийн өмнөөс илгээгдэнэ
              </p>
            </form>
          )}
        </>
      )}
    </Shell>
  );
}

const STATUS = {
  PENDING: { label: 'Хянагдаж байна', icon: Clock, cls: 'text-muted' },
  APPROVED: { label: 'Зөвшөөрөгдсөн', icon: CircleCheck, cls: 'text-ok' },
  REJECTED: { label: 'Татгалзсан', icon: XCircle, cls: 'text-bad' },
} as const;

function RequestCard({ request }: { request: Request }) {
  const s = STATUS[request.status];
  const Icon = s.icon;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[15px] font-medium">{request.name}</p>
          <p className="mt-0.5 text-[13px] text-muted">/t/{request.slug}</p>
        </div>
        <span className={`flex shrink-0 items-center gap-1.5 text-[13px] ${s.cls}`}>
          <Icon size={15} />
          {s.label}
        </span>
      </div>

      {request.reviewNote && (
        <p className="mt-3 border-t border-line pt-3 text-[13.5px] text-muted">
          {request.reviewNote}
        </p>
      )}

      {request.status === 'APPROVED' && (
        <Link
          to="/dashboard/orders"
          className="mt-3 inline-block text-[13.5px] font-medium text-ink underline-offset-4 hover:underline"
        >
          Удирдлагын самбар руу
        </Link>
      )}
    </Card>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Page className="mx-auto max-w-lg px-5 pt-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} /> Masteurent
      </Link>
      <h1 className="mt-5 text-[28px] font-semibold tracking-[-0.03em]">Ресторан нээх</h1>
      <p className="mt-1 mb-8 text-muted">
        Мэдээллээ оруулмагц ресторан шууд үүсэж, та DIRECTOR эрхтэй болно.
      </p>
      {children}
    </Page>
  );
}
