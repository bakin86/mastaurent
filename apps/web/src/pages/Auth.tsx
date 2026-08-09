import { useState, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '../lib/api';
import { startPhoneVerify, verifyPhoneCode, checkPhoneVerifyStatus, useAccount } from '../store/auth';
import { Button, Field, Input, Page } from '../components/ui';


export function VerifyMnPhoneAuth({ onSuccess }: { onSuccess: () => void }) {

  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [text, setText] = useState('');
  const [shortcode, setShortcode] = useState('144773');
  const [displayInstruction, setDisplayInstruction] = useState('');
  const [smsUri, setSmsUri] = useState('');
  const [loading, setLoading] = useState(false);

  // Poll GET /sessions/:sessionId every 3 seconds
  useEffect(() => {
    if (step !== 'code' || !sessionId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await checkPhoneVerifyStatus(sessionId);
        if (isMounted && res.verified) {
          clearInterval(interval);
          toast.success('SMS баталгаажлаа! Нэвтэрч байна...');
          await verifyPhoneCode(phone, undefined, sessionId);
          onSuccess();
        }
      } catch (err) {
        // Silently ignore 404 / 429 polling errors
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [step, sessionId, phone, onSuccess]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 8) {
      toast.error('Утасны дугаараа 8 оронтой оруулна уу');
      return;
    }
    setLoading(true);
    try {
      const res = await startPhoneVerify(phone);
      setSessionId(res.sessionId);
      setText(res.text);
      setShortcode(res.shortcode || '144773');
      setDisplayInstruction(res.displayInstruction || `${res.shortcode || '144773'} дугаарт "${res.text}" гэж SMS илгээнэ үү`);
      setSmsUri(res.smsUri);
      toast.success(res.displayInstruction || '144773 SMS баталгаажуулалт эхэллээ');
      setStep('code');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'SMS баталгаажуулалт эхлүүлэхэд алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {step === 'phone' ? (
        <form onSubmit={handleStart} className="space-y-4">
          <Field label="Утасны дугаар" hint="144773 дугаар руу MO SMS баталгаажилт илгээнэ">
            <Input
              type="tel"
              inputMode="numeric"
              placeholder="90144773"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
          <Button type="submit" full size="lg" loading={loading}>
            144773 SMS Баталгаажуулалт Эхлүүлэх (Verify.MN)
          </Button>
        </form>
      ) : (
        <div className="space-y-5 text-center">
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-xs font-semibold text-muted">
              {displayInstruction || `${shortcode} дугаарт SMS илгээнэ үү:`}
            </p>
            <p className="mt-2 font-mono text-xl font-bold tracking-widest text-primary">{text}</p>
            <a
              href={smsUri || `sms:${shortcode}?body=${text}`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-xs font-semibold text-white transition-transform active:scale-95"
            >
              Шууд SMS Илгээх ({shortcode})

            </a>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted">
            <span className="inline-block size-2 animate-ping rounded-full bg-primary" />
            <span>SMS баталгаажуулалтыг шалгаж байна (Автомат)...</span>
          </div>

          <button
            type="button"
            onClick={() => setStep('phone')}
            className="text-xs text-muted hover:text-ink hover:underline"
          >
            ← Утасны дугаар өөрчлөх
          </button>
        </div>
      )}
    </div>
  );
}




export function PlatformLogin() {
  const navigate = useNavigate();
  const { isSignedIn, ready } = useAccount();

  // Аль хэдийн нэвтэрсэн хүнд нэвтрэлтийн маягт үзүүлэх нь утгагүй —
  // ямар нэг хуудас буруу чиглүүлсэн гэсэн үг. Нүүр рүү буцаана.
  if (ready && isSignedIn) return <Navigate to="/" replace />;

  return (
    <AuthShell title="Нэвтрэх / Бүртгүүлэх" subtitle="Verify.MN 144773 SMS-ээр нэвтрэх">
      <VerifyMnPhoneAuth onSuccess={() => navigate('/')} />
      <p className="mt-6 text-center text-[13px] text-muted">
        Утасны дугаараараа 144773 SMS баталгаажуулан шууд нэвтэрнэ.
      </p>
    </AuthShell>
  );
}

export function PlatformRegister() {
  return <PlatformLogin />;
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
