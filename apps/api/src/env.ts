import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY ?? '';
const clerkSecretKey = process.env.CLERK_SECRET_KEY ?? '';

/**
 * Clerk тохируулагдсан эсэх.
 *
 * Тохируулаагүй бол сервер асаад л байна — цэс, ресторан зэрэг нийтийн
 * хэсэг ажиллана. Зөвхөн нэвтрэлт шаардсан зам нь юу дутуугий нь хэлсэн
 * 503 буцаана. Ингэснээр тохиргооны алдаа бүх төслийг унагахгүй.
 */
export const clerkConfigured = Boolean(clerkPublishableKey && clerkSecretKey);

// --- Өөрийн нэвтрэлт (нууц үг + JWT) ----------------------------------------
// Clerk-ээс хамааралгүй, үргэлж ажилладаг зам. Хоёулаа зэрэг идэвхтэй байна.

function secret(key: string, devFallback: string): string {
  const value = process.env[key];
  if (value) {
    if (isProd && value === devFallback) {
      throw new Error(`${key}: production дээр dev түлхүүрийг ашиглаж болохгүй`);
    }
    return value;
  }
  if (isProd) throw new Error(`Орчны хувьсагч дутуу байна: ${key}`);
  return devFallback;
}

export const SETUP_HINT =
  'Clerk тохируулаагүй байна. https://dashboard.clerk.com → API Keys хэсгээс ' +
  'түлхүүрээ авч apps/api/.env (CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY) ба ' +
  'apps/web/.env (VITE_CLERK_PUBLISHABLE_KEY) файлд тавина уу.';

// --- Төлбөр ------------------------------------------------------------------

const qpay = {
  username: process.env.QPAY_USERNAME ?? '',
  password: process.env.QPAY_PASSWORD ?? '',
  invoiceCode: process.env.QPAY_INVOICE_CODE ?? '',
  // Sandbox нь анхдагч — production руу зориудаар л шилжинэ.
  baseUrl: process.env.QPAY_BASE_URL ?? 'https://merchant-sandbox.qpay.mn/v2',
};

const stripe = {
  secretKey: process.env.STRIPE_SECRET_KEY ?? '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  currency: (process.env.STRIPE_CURRENCY ?? 'mnt').toLowerCase(),
};

const wire = {
  // Түлхүүрийг ЭНД БИЧИХГҮЙ — зөвхөн apps/api/.env дотор (тэр нь gitignore-д).
  secretKey: process.env.WIRE_SECRET_KEY ?? '',
};

export const qpayConfigured = Boolean(qpay.username && qpay.password && qpay.invoiceCode);
export const stripeConfigured = Boolean(stripe.secretKey);
export const wireConfigured = Boolean(wire.secretKey);

export const PAYMENT_SETUP_HINT =
  'Онлайн төлбөр тохируулаагүй байна. QPay, Wire (WIRE_SECRET_KEY) эсвэл Stripe-г apps/api/.env файлд тавина уу.';

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  /** QPay callback болон Stripe redirect энэ хаяг руу буцна. */
  publicApiUrl: process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`,
  clerkPublishableKey,
  clerkSecretKey,
  accessSecret: secret('JWT_ACCESS_SECRET', 'dev-access-secret-solino'),
  refreshSecret: secret('JWT_REFRESH_SECRET', 'dev-refresh-secret-solino'),
  /** API болон web өөр домэйн дээр байвал 'none' (+ HTTPS) шаардлагатай. */
  cookieSameSite: (process.env.COOKIE_SAMESITE ?? 'lax') as 'lax' | 'strict' | 'none',
  qpay,
  stripe,
  wire,
  // Түлхүүрийг ЭНД БИЧИХГҮЙ — зөвхөн apps/api/.env дотор.
  verifyMnApiKey: process.env.VERIFY_MN_API_KEY ?? '',
  isProd,
};

export const verifyMnConfigured = Boolean(env.verifyMnApiKey);



// Production дээр тохиргоогүй ажиллуулах нь алдаа — тэнд шууд зогсооно.
if (isProd && !clerkConfigured) throw new Error(SETUP_HINT);
