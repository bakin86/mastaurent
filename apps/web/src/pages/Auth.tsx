import { Link, useNavigate } from 'react-router-dom';
import { SignIn, SignUp } from '@clerk/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '../lib/api';
import { clerkEnabled } from '../lib/clerk';
import { loginWithPassword, registerWithPassword } from '../store/auth';
import { Button, Field, Input, Page } from '../components/ui';

/**
 * Платформын нэвтрэлт — ресторанаас хамааралгүй.
 * Нэг удаа бүртгүүлээд бүх ресторанд хандана.
 */

const appearance = {
  variables: {
    colorPrimary: '#0a0a0a',
    borderRadius: '11px',
    fontFamily: '"Helvetica Neue", Inter, Helvetica, Arial, sans-serif',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full shadow-none border-0',
    card: 'bg-transparent shadow-none border-0 p-0',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    footer: 'bg-transparent',
  },
} as const;

const loginSchema = z.object({
  email: z.string().email('И-мэйл буруу байна'),
  password: z.string().min(1, 'Нууц үгээ оруулна уу'),
});

export function PlatformLogin() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });

  return (
    <AuthShell title="Тавтай морил" subtitle="Ресторанууд руу нэвтрэх">
      <form
        onSubmit={handleSubmit(async (v) => {
          try {
            await loginWithPassword(v.email, v.password);
            toast.success('Амжилттай нэвтэрлээ');
            navigate('/');
          } catch (e) {
            toast.error(e instanceof ApiError ? e.message : 'Нэвтрэхэд алдаа гарлаа');
          }
        })}
        className="space-y-4"
      >
        <Field label="И-мэйл" error={errors.email?.message}>
          <Input type="email" placeholder="name@mail.mn" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Нууц үг" error={errors.password?.message}>
          <Input
            type="password"
            placeholder="••••••"
            autoComplete="current-password"
            {...register('password')}
          />
        </Field>

        <Button type="submit" full size="lg" loading={isSubmitting}>
          Нэвтрэх
        </Button>
        <Link
          to="/register"
          className="flex w-full items-center justify-center rounded-[11px] border border-line px-5 py-3 text-[14px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-black/[0.03]"
        >
          Шинэ USER бүртгэл үүсгэх
        </Link>
      </form>

      <button
        type="button"
        onClick={() => {
          setValue('email', 'hereglegch@hool.mn');
          setValue('password', '123456');
          toast('Демо хэрэглэгчийн мэдээлэл бөглөгдлөө');
        }}
        className="mt-3 w-full rounded-[11px] border border-dashed border-line py-2.5 text-[13px] text-muted transition-colors hover:border-line-strong hover:text-ink"
      >
        Демо: hereglegch@hool.mn · нууц үг 123456
      </button>

      {clerkEnabled && (
        <ClerkBlock>
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/register"
            fallbackRedirectUrl="/"
            appearance={appearance}
          />
        </ClerkBlock>
      )}

      <p className="mt-6 text-center text-[13px] text-muted">
        Шинээр бүртгүүлсэн хэрэглэгч автоматаар USER эрхтэй болно.
      </p>
    </AuthShell>
  );
}

const registerSchema = z.object({
  name: z.string().min(2, 'Нэр хамгийн багадаа 2 тэмдэгт'),
  email: z.string().email('И-мэйл буруу байна'),
  phone: z.string().regex(/^\d{8}$/, 'Утасны дугаар 8 оронтой тоо байна'),
  password: z.string().min(6, 'Нууц үг хамгийн багадаа 6 тэмдэгт'),
});

export function PlatformRegister() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });

  return (
    <AuthShell title="Бүртгүүлэх" subtitle="Нэг бүртгэлээр бүх ресторанд">
      <form
        onSubmit={handleSubmit(async (v) => {
          try {
            await registerWithPassword(v);
            toast.success('Бүртгэл амжилттай!');
            navigate('/');
          } catch (e) {
            toast.error(e instanceof ApiError ? e.message : 'Бүртгүүлэхэд алдаа гарлаа');
          }
        })}
        className="space-y-4"
      >
        <Field label="Нэр" error={errors.name?.message}>
          <Input placeholder="Батбаяр" {...register('name')} />
        </Field>
        <Field label="И-мэйл" error={errors.email?.message}>
          <Input type="email" placeholder="name@mail.mn" {...register('email')} />
        </Field>
        <Field label="Утас" error={errors.phone?.message}>
          <Input inputMode="numeric" placeholder="99112233" {...register('phone')} />
        </Field>
        <Field label="Нууц үг" error={errors.password?.message} hint="Хамгийн багадаа 6 тэмдэгт">
          <Input
            type="password"
            placeholder="••••••"
            autoComplete="new-password"
            {...register('password')}
          />
        </Field>

        <Button type="submit" full size="lg" loading={isSubmitting}>
          Бүртгүүлэх
        </Button>
      </form>

      {clerkEnabled && (
        <ClerkBlock>
          <SignUp
            routing="path"
            path="/register"
            signInUrl="/login"
            fallbackRedirectUrl="/"
            appearance={appearance}
          />
        </ClerkBlock>
      )}

      <p className="mt-6 text-center text-[14px] text-muted">
        Бүртгэлтэй юу?{' '}
        <Link to="/login" className="font-medium text-ink underline-offset-4 hover:underline">
          Нэвтрэх
        </Link>
      </p>
    </AuthShell>
  );
}

function ClerkBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-7">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="label">эсвэл</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <Page className="mx-auto max-w-sm px-5 pt-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} /> Masteurent
      </Link>
      <h1 className="mt-5 text-[28px] font-semibold tracking-[-0.03em]">{title}</h1>
      <p className="mt-1 mb-7 text-muted">{subtitle}</p>
      {children}
    </Page>
  );
}
