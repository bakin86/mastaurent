import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { SignIn } from '@clerk/react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '../../lib/api';
import { clerkEnabled } from '../../lib/clerk';
import { isStaff, loginWithPassword, useStaffMember } from '../../store/auth';
import { Button, Field, Input, Page } from '../../components/ui';

/**
 * Ажилтны нэвтрэлт.
 *
 * Ресторан сонгох шаардлагагүй — нэвтэрсний дараа сервер тухайн дансны
 * ажилтны гишүүнчлэлээс аль рестораных болохыг тодорхойлно.
 */
export function DashboardLogin() {
  const { user, ready, isSignedIn, error } = useStaffMember();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', '#0a0a0a');
    document.title = 'Ресторан нэвтрэх';
  }, []);

  if (ready && isStaff(user)) return <Navigate to="/dashboard/orders" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await loginWithPassword(email, password);
      // Ажилтны эрхийг сервер шийднэ — useStaffMember дараагийн render дээр
      // шинэчлэгдэж, эрхтэй бол дээрх Navigate ажиллана.
      toast.success('Тавтай морил');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Нэвтрэхэд алдаа гарлаа');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page className="mx-auto max-w-sm px-5 pt-16">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} /> Masteurent
      </Link>

      <h1 className="mt-5 text-[28px] font-semibold tracking-[-0.03em]">Удирдлагын самбар</h1>
      <p className="mt-1 mb-7 text-muted">Рестораны ажилтны нэвтрэлт</p>

      <form onSubmit={submit} className="space-y-4">
        <Field label="И-мэйл">
          <Input
            type="email"
            placeholder="owner@hool.mn"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Нууц үг">
          <Input
            type="password"
            placeholder="••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Button type="submit" full size="lg" loading={busy}>
          Нэвтрэх
        </Button>
      </form>

      {/* Браузерын autofill буруу утга санаж байвал энэ товч дарж засна. */}
      <button
        type="button"
        onClick={() => {
          setEmail('huslen@hool.mn');
          setPassword('123456');
          toast('Демо мэдээлэл бөглөгдлөө');
        }}
        className="mt-3 w-full rounded-[11px] border border-dashed border-line py-2.5 text-[13px] text-muted transition-colors hover:border-line-strong hover:text-ink"
      >
        Демо: huslen@hool.mn · нууц үг 123456
      </button>

      {clerkEnabled && !isSignedIn && (
        <div className="mt-7">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="label">эсвэл</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="mt-5">
            <SignIn
              routing="path"
              path="/dashboard/login"
              fallbackRedirectUrl="/dashboard/orders"
              appearance={{
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
              }}
            />
          </div>
        </div>
      )}

      {/* 403 = сесс хүчинтэй, зүгээр л ажилтны эрх алга. */}
      {ready && isSignedIn && !isStaff(user) && error?.status === 403 && (
        <div className="mt-6 rounded-[12px] border border-dashed border-line p-5 text-[14px] text-muted">
          <p className="font-medium text-ink">Энэ бүртгэл удирдлагын эрхгүй байна.</p>
          <p className="mt-2">Рестораны эзний и-мэйлээр нэвтэрсэн эсэхээ шалгана уу.</p>
        </div>
      )}

      {/* 401 = серверт сесс танигдаагүй — Clerk-ийн нууц түлхүүр буруу байж болно. */}
      {ready && isSignedIn && !isStaff(user) && error?.status === 401 && (
        <div className="mt-6 rounded-[12px] border border-dashed border-bad/40 p-5 text-[14px] text-muted">
          <p className="font-medium text-ink">Сервер сессийг таньсангүй.</p>
          <p className="mt-2">
            Google-ээр нэвтрэлт Clerk дээр амжилттай болсон ч сервер түүнийг
            баталгаажуулж чадахгүй байна — <code>CLERK_SECRET_KEY</code> буруу
            байх магадлалтай. Шалгах: <code>npm run clerk:check</code>
          </p>
        </div>
      )}
    </Page>
  );
}
