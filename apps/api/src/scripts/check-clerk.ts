import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Clerk-ийн тохиргоог шалгана: түлхүүр байгаа эсэх, хэлбэр зөв эсэх,
 * хоёр талын нийтийн түлхүүр таарч байгаа эсэх, мөн нууц түлхүүр нь
 * Clerk дээр ҮНЭХЭЭР ажиллаж байгаа эсэх.
 *
 *   npm run clerk:check
 */

const ok = (m: string) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m: string) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const hint = (m: string) => console.log(`    ${m}`);

let failed = false;
const fail = (m: string, h?: string) => {
  bad(m);
  if (h) hint(h);
  failed = true;
};

/** .env файлыг энгийнээр уншина (dotenv нь зөвхөн apps/api-г ачаалдаг). */
function readEnvFile(path: string): Record<string, string> {
  try {
    const out: Record<string, string> = {};
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
    return out;
  } catch {
    return {};
  }
}

/** pk_test_<base64> дотор Clerk-ийн frontend домэйн шифрлэгдсэн байдаг. */
function domainOf(pk: string): string | null {
  try {
    const encoded = pk.replace(/^pk_(test|live)_/, '');
    return Buffer.from(encoded, 'base64').toString('utf8').replace(/\$$/, '') || null;
  } catch {
    return null;
  }
}

const modeOf = (key: string) => (key.includes('_live_') ? 'live' : key.includes('_test_') ? 'test' : null);

async function main() {
  console.log('\nClerk тохиргооны шалгалт\n');

  const apiPk = process.env.CLERK_PUBLISHABLE_KEY ?? '';
  const apiSk = process.env.CLERK_SECRET_KEY ?? '';
  const webEnvPath = resolve(process.cwd(), '../web/.env');
  const webPk = readEnvFile(webEnvPath).VITE_CLERK_PUBLISHABLE_KEY ?? '';

  // 1. Байгаа эсэх
  if (!apiPk) fail('apps/api/.env → CLERK_PUBLISHABLE_KEY хоосон');
  if (!apiSk) fail('apps/api/.env → CLERK_SECRET_KEY хоосон');
  if (!webPk) fail('apps/web/.env → VITE_CLERK_PUBLISHABLE_KEY хоосон');

  if (failed) {
    hint('');
    hint('https://dashboard.clerk.com → application → API Keys');
    hint('pk_... нь ХОЁУЛАНД, sk_... нь ЗӨВХӨН apps/api/.env дотор.');
    process.exit(1);
  }
  ok('Гурван түлхүүр бүгд бөглөгдсөн');

  // 2. Хэлбэр
  if (!/^pk_(test|live)_/.test(apiPk)) fail('CLERK_PUBLISHABLE_KEY нь pk_test_ эсвэл pk_live_-ээр эхлэх ёстой');
  if (!/^sk_(test|live)_/.test(apiSk)) fail('CLERK_SECRET_KEY нь sk_test_ эсвэл sk_live_-ээр эхлэх ёстой');
  if (apiSk.startsWith('pk_')) hint('Нийтийн болон нууц түлхүүрээ андуурсан байж магадгүй.');

  // 3. Хоёр талын нийтийн түлхүүр таарах ёстой
  if (apiPk !== webPk) {
    fail(
      'apps/api болон apps/web дэх нийтийн түлхүүр ЗӨРЖ байна',
      'Хоёулаа Clerk-ийн ижил application-ийн pk_... байх ёстой.',
    );
  } else {
    ok('API ба Web-ийн нийтийн түлхүүр таарч байна');
  }

  // 4. test/live горим таарах ёстой
  if (modeOf(apiPk) && modeOf(apiSk) && modeOf(apiPk) !== modeOf(apiSk)) {
    fail(`Горим зөрж байна: pk=${modeOf(apiPk)}, sk=${modeOf(apiSk)}`);
  }

  const domain = domainOf(apiPk);
  if (domain) ok(`Clerk instance: ${domain} (${modeOf(apiPk)} горим)`);

  // Хамгийн түгээмэл алдаа: pk-г хуулаад угтварыг нь sk болгож өөрчлөх.
  // Жинхэнэ нууц түлхүүр домэйн агуулдаггүй.
  const skBody = apiSk.replace(/^sk_(test|live)_/, '');
  const pkBody = apiPk.replace(/^pk_(test|live)_/, '');
  if (skBody === pkBody) {
    bad('CLERK_SECRET_KEY нь НИЙТИЙН түлхүүрийн агуулгатай ижил байна');
    hint('');
    hint('pk_test_... гэснийг хуулаад угтварыг нь sk_ болгож өөрчилсөн байна.');
    hint('Жинхэнэ нууц түлхүүр огт өөр харагдана — домэйн агуулаагүй,');
    hint('санамсаргүй тэмдэгтүүдээс тогтоно.');
    hint('');
    hint('Dashboard → API Keys хуудсанд "Secret keys" гэсэн ТУСДАА хэсэг бий.');
    hint('Утга нь нуугдсан байдаг — нүдний тэмдэг эсвэл Copy товч дарж хуулна.');
    hint('');
    process.exit(1);
  }

  // 5. Нууц түлхүүр ҮНЭХЭЭР ажиллаж байгаа эсэх
  try {
    const res = await fetch('https://api.clerk.com/v1/users?limit=1', {
      headers: { Authorization: `Bearer ${apiSk}` },
    });

    if (res.ok) ok('Нууц түлхүүр Clerk дээр баталгаажлаа');
    else if (res.status === 401) fail('Нууц түлхүүрийг Clerk хүлээж авсангүй (401)', 'Түлхүүрээ дахин хуулж тавина уу.');
    else fail(`Clerk API гэнэтийн хариу: ${res.status}`);
  } catch {
    fail('Clerk API руу холбогдож чадсангүй', 'Интернэт холболтоо шалгана уу.');
  }

  console.log('');
  if (failed) {
    console.log('Тохиргоо дутуу байна. Дээрх зүйлсийг засаад дахин ажиллуулна уу.\n');
    process.exit(1);
  }
  console.log('Бүгд зөв. npm run dev-ээ дахин асаахад нэвтрэлт ажиллана.\n');
}

void main();
