// Бие даасан скрипт тул .env-ээ өөрөө ачаална.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, type OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();
const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=70`;

/**
 * Рестораны монограм лого — брэнд өнгөтэй SVG.
 *
 * Гадны файл, CDN шаардахгүйгээр өгөгдлийн санд шууд хадгалагдана.
 * Вектор тул ямар ч хэмжээнд тод; эможи ашиглаагүй, Swiss editorial
 * харагдацтай нийцнэ.
 */
const logo = (initials: string, color: string) => {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<rect width="100" height="100" rx="24" fill="${color}"/>` +
    `<text x="50" y="50" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="Helvetica Neue,Helvetica,Arial,sans-serif" font-size="34" ` +
    `font-weight="600" letter-spacing="1.5" fill="#FAF9F6">${initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
};

type SeedItem = {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  popular?: boolean;
  calories?: number;
  prep?: number;
  tags?: string;
  groups?: { name: string; required?: boolean; maxSelect?: number; options: [string, number][] }[];
};

type SeedTenant = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  accentColor: string;
  logoUrl: string;
  coverUrl: string;
  phone: string;
  address: string;
  deliveryFee: number;
  minOrder: number;
  etaMinutes: number;
  rating: number;
  category?: string;
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
  owner: { name: string; email: string };
  categories: { name: string; items: SeedItem[] }[];
};

const SIZE = {
  name: 'Хэмжээ',
  required: true,
  maxSelect: 1,
  options: [
    ['Жижиг', 0],
    ['Дунд', 2000],
    ['Том', 4000],
  ] as [string, number][],
};

const tenants: SeedTenant[] = [
  {
    slug: 'huslen-buuz',
    name: 'Хүслэн Бууз',
    tagline: 'Гэрийн амттай монгол хоол',
    description:
      'Гурван үеийн жороор бэлтгэсэн жинхэнэ монгол хоол. Мах, гурилаа өдөр бүр шинээр бэлддэг.',
    accentColor: '#C1440E',
    logoUrl: logo('ХБ', '#C1440E'),
    coverUrl: img('photo-1547592166-23ac45744acd'),
    phone: '7011-2233',
    address: 'СБД, 1-р хороо, Их сургуулийн гудамж 12',
    deliveryFee: 3000,
    minOrder: 12000,
    etaMinutes: 30,
    rating: 4.9,
    owner: { name: 'Батсайхан', email: 'huslen@hool.mn' },
    categories: [
      {
        name: 'Уурын хоол',
        items: [
          {
            name: 'Бууз',
            description: 'Гар хийцийн үхрийн махан бууз. 5 ширхэг.',
            price: 9000,
            imageUrl: img('photo-1563245372-f21724e3856d'),
            popular: true,
            calories: 620,
            prep: 18,
            tags: 'эрэлттэй',
            groups: [
              {
                name: 'Тоо ширхэг',
                required: true,
                maxSelect: 1,
                options: [
                  ['5 ширхэг', 0],
                  ['10 ширхэг', 8000],
                  ['15 ширхэг', 15000],
                ],
              },
              {
                name: 'Нэмэлт',
                maxSelect: 3,
                options: [
                  ['Чинжүүтэй сүмс', 500],
                  ['Ногоон цай', 1500],
                  ['Даршилсан ногоо', 1000],
                ],
              },
            ],
          },
          {
            name: 'Банштай цай',
            description: 'Сүүтэй цайнд халуун банш. Өвлийн дуртай хоол.',
            price: 8500,
            imageUrl: img('photo-1547592166-23ac45744acd'),
            calories: 480,
            prep: 12,
          },
          {
            name: 'Хуушуур',
            description: 'Шаржигнатал шарсан махан хуушуур. 3 ширхэг.',
            price: 8000,
            imageUrl: img('photo-1585032226651-759b368d7246'),
            popular: true,
            calories: 700,
            prep: 15,
            tags: 'эрэлттэй',
          },
        ],
      },
      {
        name: 'Гол хоол',
        items: [
          {
            name: 'Цуйван',
            description: 'Гар гурилтай уурын цуйван, хонины махтай.',
            price: 13000,
            imageUrl: img('photo-1585032226651-759b368d7246'),
            popular: true,
            calories: 780,
            prep: 20,
            groups: [SIZE],
          },
          {
            name: 'Гуляш',
            description: 'Зөөлөн үхрийн мах, төмстэй шөл, талхтай.',
            price: 14500,
            imageUrl: img('photo-1546964124-0cce460f38ef'),
            calories: 690,
            prep: 22,
          },
          {
            name: 'Хорхог',
            description: 'Халуун чулуугаар чанасан хонины хорхог. 2 хүний порц.',
            price: 38000,
            imageUrl: img('photo-1544025162-d76694265947'),
            calories: 1200,
            prep: 45,
            tags: 'онцгой',
          },
        ],
      },
      {
        name: 'Уух зүйл',
        items: [
          {
            name: 'Сүүтэй цай',
            description: 'Уламжлалт монгол сүүтэй цай.',
            price: 2500,
            imageUrl: img('photo-1509042239860-f550ce710b93'),
            prep: 5,
          },
          {
            name: 'Айраг',
            description: 'Хөдөөнөөс шууд, 0.5л.',
            price: 6000,
            imageUrl: img('photo-1621263764928-df1444c5e859'),
            prep: 5,
            tags: 'улирлын',
          },
        ],
      },
    ],
  },
  {
    slug: 'sakura-sushi',
    name: 'Sakura Sushi',
    tagline: 'Шинэхэн, нарийн, японоор',
    description: 'Японы сургалт дүүргэсэн тогооч нар өдөр бүр шинэ загаснаас бэлтгэнэ.',
    accentColor: '#D6336C',
    logoUrl: logo('SS', '#D6336C'),
    coverUrl: img('photo-1579871494447-9811cf80d66c'),
    phone: '7755-8899',
    address: 'ХУД, 15-р хороо, Зайсангийн гудамж 7',
    deliveryFee: 5000,
    minOrder: 25000,
    etaMinutes: 40,
    rating: 4.7,
    owner: { name: 'Энхжаргал', email: 'sakura@hool.mn' },
    categories: [
      {
        name: 'Суши сет',
        items: [
          {
            name: 'Филадельфи ролл',
            description: 'Хулд загас, крем бяслаг, өргөст хэмх. 8 ширхэг.',
            price: 26000,
            imageUrl: img('photo-1579871494447-9811cf80d66c'),
            popular: true,
            calories: 540,
            prep: 18,
            tags: 'эрэлттэй',
            groups: [
              {
                name: 'Нэмэлт',
                maxSelect: 3,
                options: [
                  ['Нэмэлт васаби', 500],
                  ['Цагаан идээ соус', 1000],
                  ['Гарь (шар)', 800],
                ],
              },
            ],
          },
          {
            name: 'Калифорни ролл',
            description: 'Хавч, авокадо, тобико. 8 ширхэг.',
            price: 23000,
            imageUrl: img('photo-1617196034796-73dfa7b1fd56'),
            calories: 490,
            prep: 18,
          },
          {
            name: 'Сакура сет',
            description: '24 ширхэг холимог ролл — 3-4 хүнд.',
            price: 68000,
            imageUrl: img('photo-1553621042-f6e147245754'),
            popular: true,
            calories: 1500,
            prep: 30,
            tags: 'онцгой',
          },
        ],
      },
      {
        name: 'Халуун хоол',
        items: [
          {
            name: 'Тонкоцү рамен',
            description: 'Гахайн ястай 12 цаг чанасан шөл, чашү мах.',
            price: 21000,
            imageUrl: img('photo-1591814468924-caf88d1232e1'),
            popular: true,
            calories: 810,
            prep: 20,
            groups: [
              {
                name: 'Хатуулаг',
                required: true,
                maxSelect: 1,
                options: [
                  ['Дунд зэрэг', 0],
                  ['Халуун', 0],
                  ['Маш халуун', 500],
                ],
              },
            ],
          },
          {
            name: 'Чикен карааге',
            description: 'Японы гүн шарсан тахианы мах, лимонтой.',
            price: 17000,
            imageUrl: img('photo-1626645738196-c2a7c87a8f58'),
            calories: 620,
            prep: 15,
          },
        ],
      },
      {
        name: 'Амттан',
        items: [
          {
            name: 'Мочи (3 ширхэг)',
            description: 'Цангис, манго, ногоон цайны амтаар.',
            price: 9000,
            imageUrl: img('photo-1578985545062-69928b1d9587'),
            calories: 320,
            prep: 5,
          },
        ],
      },
    ],
  },
  {
    slug: 'modun-burger',
    name: 'Modun Burger',
    tagline: 'Галд шарсан, том амттай',
    description: 'Монгол үхрийн махнаас өдөр бүр шинээр бэлтгэсэн 100% котлет.',
    accentColor: '#EA580C',
    logoUrl: logo('MB', '#EA580C'),
    coverUrl: img('photo-1568901346375-23c9450c58cd'),
    phone: '9911-4455',
    address: 'БЗД, 3-р хороо, Их тойруу 45',
    deliveryFee: 2500,
    minOrder: 15000,
    etaMinutes: 25,
    rating: 4.6,
    owner: { name: 'Тэмүүжин', email: 'modun@hool.mn' },
    categories: [
      {
        name: 'Бургер',
        items: [
          {
            name: 'Modun Classic',
            description: '180гр котлет, чеддар бяслаг, гэрийн соус.',
            price: 16500,
            imageUrl: img('photo-1568901346375-23c9450c58cd'),
            popular: true,
            calories: 750,
            prep: 14,
            tags: 'эрэлттэй',
            groups: [
              {
                name: 'Котлет',
                required: true,
                maxSelect: 1,
                options: [
                  ['Дан', 0],
                  ['Давхар', 6000],
                ],
              },
              {
                name: 'Нэмэлт',
                maxSelect: 4,
                options: [
                  ['Нэмэлт бяслаг', 1500],
                  ['Бекон', 3000],
                  ['Шарсан сонгино', 1000],
                  ['Халапеньо', 1000],
                ],
              },
            ],
          },
          {
            name: 'Тахианы бургер',
            description: 'Шаржигнуур тахиа, coleslaw, ранч соус.',
            price: 15000,
            imageUrl: img('photo-1626645738196-c2a7c87a8f58'),
            calories: 680,
            prep: 14,
          },
          {
            name: 'Ногоон бургер',
            description: 'Вандуйн уурагтай котлет, цагаан хоолтонд.',
            price: 15500,
            imageUrl: img('photo-1512621776951-a57141f2eefd'),
            calories: 520,
            prep: 14,
            tags: 'цагаан хоол',
          },
        ],
      },
      {
        name: 'Хажуугийн',
        items: [
          {
            name: 'Шарсан төмс',
            description: 'Далайн давстай, гэрийн соустай.',
            price: 6500,
            imageUrl: img('photo-1573080496219-bb080dd4f877'),
            popular: true,
            calories: 410,
            prep: 8,
            groups: [SIZE],
          },
          {
            name: 'Сонгины цагираг',
            description: 'Шаржигнуур бүрхүүлтэй, 8 ширхэг.',
            price: 7500,
            imageUrl: img('photo-1639024471283-03518883512d'),
            calories: 450,
            prep: 10,
          },
        ],
      },
      {
        name: 'Уух зүйл',
        items: [
          {
            name: 'Гэрийн нимбэгний ундаа',
            description: 'Шинэ нимбэг, мянт. 0.4л.',
            price: 5500,
            imageUrl: img('photo-1621263764928-df1444c5e859'),
            calories: 150,
            prep: 5,
          },
          {
            name: 'Шоколадтай шэйк',
            description: 'Бельги шоколад, зайрмаг.',
            price: 8500,
            imageUrl: img('photo-1572490122747-3968b75cc699'),
            calories: 520,
            prep: 7,
          },
        ],
      },
    ],
  },
  {
    slug: 'napoli-pizza',
    name: 'Napoli Pizza',
    tagline: 'Модон зуухны жинхэнэ итали',
    description:
      'Неаполитан жороор 48 цаг исгэсэн зуурмаг, 400°C модон зуухан дээр 90 секунд шарна.',
    accentColor: '#166534',
    logoUrl: logo('NP', '#166534'),
    coverUrl: img('photo-1513104890138-7c749659a591'),
    phone: '7755-8899',
    address: 'ЧД, 4-р хороо, Сөүлийн гудамж 8',
    deliveryFee: 3500,
    minOrder: 18000,
    etaMinutes: 35,
    rating: 4.7,
    owner: { name: 'Марко', email: 'napoli@hool.mn' },
    categories: [
      {
        name: 'Пицца',
        items: [
          {
            name: 'Маргарита',
            description: 'Сан-Марцано улаан лооль, моцарелла, шинэ базилик.',
            price: 24000,
            imageUrl: img('photo-1513104890138-7c749659a591'),
            popular: true,
            calories: 850,
            prep: 15,
            tags: 'эрэлттэй,цагаан хоол',
            groups: [
              {
                name: 'Хэмжээ',
                required: true,
                maxSelect: 1,
                options: [
                  ['26см', 0],
                  ['32см', 7000],
                  ['40см', 14000],
                ],
              },
              {
                name: 'Нэмэлт',
                maxSelect: 3,
                options: [
                  ['Нэмэлт моцарелла', 3000],
                  ['Пепперони', 4000],
                  ['Мөөг', 2500],
                ],
              },
            ],
          },
          {
            name: 'Пепперони',
            description: 'Давхар пепперони, моцарелла, орегано.',
            price: 28000,
            imageUrl: img('photo-1574071318508-1cdbab80d002'),
            popular: true,
            calories: 980,
            prep: 15,
            tags: 'эрэлттэй',
          },
          {
            name: 'Кватро формаджи',
            description: 'Дөрвөн бяслаг: моцарелла, горгонзола, пармезан, рикотта.',
            price: 31000,
            imageUrl: img('photo-1595854341625-f33ee10dbf94'),
            calories: 1100,
            prep: 16,
            tags: 'цагаан хоол',
          },
        ],
      },
      {
        name: 'Паста',
        items: [
          {
            name: 'Карбонара',
            description: 'Гуанчиале, пекорино, өндөгний шар. Цөцгийгүй, жинхэнэ ромын жор.',
            price: 22000,
            imageUrl: img('photo-1621996346565-e3dbc646d9a9'),
            popular: true,
            calories: 790,
            prep: 14,
            tags: 'эрэлттэй',
          },
          {
            name: 'Болоньезе',
            description: 'Гурван цаг буцалгасан үхрийн махан соус, тальятелле.',
            price: 23500,
            imageUrl: img('photo-1551024709-8f23befc6f87'),
            calories: 860,
            prep: 14,
          },
        ],
      },
      {
        name: 'Уух зүйл',
        items: [
          {
            name: 'Лимончелло сод',
            description: 'Сицилийн нимбэг, гар хийцийн сироп, оргилуун ус.',
            price: 6500,
            imageUrl: img('photo-1621263764928-df1444c5e859'),
            calories: 120,
            prep: 4,
          },
          {
            name: 'Эспрессо',
            description: 'Итали шарлагатай, давхар шот.',
            price: 4500,
            imageUrl: img('photo-1510707577719-ae7c14805e3a'),
            calories: 10,
            prep: 3,
          },
          {
            name: 'Улаан лоолийн шүүс',
            description: 'Шинэ шахсан, давс, базиликтай.',
            price: 5500,
            imageUrl: img('photo-1600271886742-f049cd451bba'),
            calories: 90,
            prep: 3,
          },
        ],
      },
    ],
  },
  {
    slug: 'seoul-kitchen',
    name: 'Seoul Kitchen',
    tagline: 'Халуун ногоотой солонгос амт',
    description:
      'Кимчигээ өөрсдөө исгэж, гочужанг соусаа гар хийцээр бэлтгэдэг. Хурц байдлаа өөрөө сонгоно.',
    accentColor: '#B91C1C',
    logoUrl: logo('SK', '#B91C1C'),
    coverUrl: img('photo-1590301157890-4810ed352733'),
    phone: '9900-7788',
    address: 'ХУД, 11-р хороо, Чингисийн өргөн чөлөө 21',
    deliveryFee: 3000,
    minOrder: 16000,
    etaMinutes: 30,
    rating: 4.8,
    owner: { name: 'Мин Жү', email: 'seoul@hool.mn' },
    categories: [
      {
        name: 'Гол хоол',
        items: [
          {
            name: 'Бибимбап',
            description: 'Халуун чулуун аяганд будаа, ногоо, үхрийн мах, гочужанг соус.',
            price: 19500,
            imageUrl: img('photo-1553163147-622ab57be1c7'),
            popular: true,
            calories: 720,
            prep: 16,
            tags: 'эрэлттэй',
            groups: [
              {
                name: 'Хурц байдал',
                required: true,
                maxSelect: 1,
                options: [
                  ['Хурцгүй', 0],
                  ['Дунд', 0],
                  ['Маш хурц', 0],
                ],
              },
              {
                name: 'Нэмэлт',
                maxSelect: 3,
                options: [
                  ['Шарсан өндөг', 1500],
                  ['Нэмэлт мах', 5000],
                  ['Кимчи', 2000],
                ],
              },
            ],
          },
          {
            name: 'Токпокки',
            description: 'Будааны бялуу, чинжүүтэй соус, загасны бялуу.',
            price: 15000,
            imageUrl: img('photo-1607013251379-e6eecfffe234'),
            popular: true,
            calories: 610,
            prep: 13,
            tags: 'эрэлттэй,хурц',
          },
          {
            name: 'Булгоги',
            description: 'Соёогийн соусанд даршилсан үхрийн мах, будаатай.',
            price: 24000,
            imageUrl: img('photo-1580651315530-69c8e0026377'),
            calories: 830,
            prep: 18,
          },
        ],
      },
      {
        name: 'Хөнгөн зууш',
        items: [
          {
            name: 'Кимбап',
            description: 'Далайн замагт ороосон будаа, ногоо, өндөг. 8 зүсэм.',
            price: 12000,
            imageUrl: img('photo-1567620905732-2d1ec7ab7445'),
            calories: 420,
            prep: 10,
          },
          {
            name: 'Тахианы канжон',
            description: 'Хоёр удаа шарсан тахиа, соёо-сармисны бүрхүүлтэй.',
            price: 18000,
            imageUrl: img('photo-1571091718767-18b5b1457add'),
            calories: 760,
            prep: 17,
            tags: 'хурц',
          },
        ],
      },
      {
        name: 'Уух зүйл',
        items: [
          {
            name: 'Банана сүү',
            description: 'Солонгосын сонгодог, хөргөсөн.',
            price: 5000,
            imageUrl: img('photo-1541167760496-1628856ab772'),
            calories: 180,
            prep: 2,
          },
          {
            name: 'Южа цай',
            description: 'Зөгийн балтай citron цай, халуун эсвэл хүйтэн.',
            price: 6000,
            imageUrl: img('photo-1544787219-7f47ccb76574'),
            calories: 130,
            prep: 5,
          },
        ],
      },
    ],
  },
  {
    slug: 'green-bean',
    name: 'Green Bean',
    tagline: 'Өөрсдөө шарсан кофе, шинэ талх',
    description:
      'Долоо хоног бүр шинээр шарсан үрийн кофе. Талх, амттанаа өглөө бүр газар дээрээ бэлтгэнэ.',
    accentColor: '#0F766E',
    logoUrl: logo('GB', '#0F766E'),
    coverUrl: img('photo-1414235077428-338989a2e8c0'),
    phone: '7700-1122',
    address: 'СБД, 8-р хороо, Бага тойруу 3',
    deliveryFee: 2000,
    minOrder: 8000,
    etaMinutes: 20,
    rating: 4.9,
    category: 'Кафе, амттан',
    // Жишээ: зөвхөн газар дээрээ авах кафе — хүргэлтгүй.
    deliveryEnabled: false,
    owner: { name: 'Ануужин', email: 'greenbean@hool.mn' },
    categories: [
      {
        name: 'Кофе',
        items: [
          {
            name: 'Флэт вайт',
            description: 'Давхар шот, торх сүү. Манай хамгийн эрэлттэй.',
            price: 7500,
            imageUrl: img('photo-1461023058943-07fcbe16d735'),
            popular: true,
            calories: 150,
            prep: 5,
            tags: 'эрэлттэй',
            groups: [
              {
                name: 'Сүү',
                required: true,
                maxSelect: 1,
                options: [
                  ['Энгийн сүү', 0],
                  ['Овъёосны сүү', 1000],
                  ['Бадамны сүү', 1000],
                ],
              },
              {
                name: 'Нэмэлт',
                maxSelect: 2,
                options: [
                  ['Нэмэлт шот', 1500],
                  ['Ванилийн сироп', 800],
                  ['Карамель сироп', 800],
                ],
              },
            ],
          },
          {
            name: 'Латте',
            description: 'Зөөлөн, сүү давамгайлсан.',
            price: 7000,
            imageUrl: img('photo-1495474472287-4d71bcdd2085'),
            popular: true,
            calories: 190,
            prep: 5,
            tags: 'эрэлттэй',
          },
          {
            name: 'Хүйтэн шүүрэлт',
            description: '18 цаг хүйтнээр шүүсэн, гашуун амтгүй.',
            price: 8000,
            imageUrl: img('photo-1520201163981-8cc95007dd2a'),
            calories: 25,
            prep: 3,
          },
        ],
      },
      {
        name: 'Талх, амттан',
        items: [
          {
            name: 'Круассан',
            description: 'Францын цөцгийн тостой, 27 давхарга.',
            price: 5500,
            imageUrl: img('photo-1555507036-ab1f4038808a'),
            popular: true,
            calories: 340,
            prep: 3,
            tags: 'эрэлттэй,цагаан хоол',
          },
          {
            name: 'Шоколадан бялуу',
            description: 'Бельги шоколад, давсалсан карамель.',
            price: 9500,
            imageUrl: img('photo-1578985545062-69928b1d9587'),
            calories: 480,
            prep: 3,
          },
          {
            name: 'Чизкейк',
            description: 'Нью-Йорк маягийн, улаан жимсний соустай.',
            price: 10000,
            imageUrl: img('photo-1498654896293-37aacf113fd9'),
            calories: 450,
            prep: 3,
            tags: 'цагаан хоол',
          },
        ],
      },
      {
        name: 'Цай, жүүс',
        items: [
          {
            name: 'Матча латте',
            description: 'Японы церемонийн зэрэглэлийн матча.',
            price: 8500,
            imageUrl: img('photo-1544787219-7f47ccb76574'),
            calories: 160,
            prep: 5,
            tags: 'цагаан хоол',
          },
          {
            name: 'Улбар шар жүүс',
            description: 'Өглөө бүр шинээр шахсан.',
            price: 6500,
            imageUrl: img('photo-1600271886742-f049cd451bba'),
            calories: 110,
            prep: 3,
          },
        ],
      },
    ],
  },
];

const DISTRICTS = ['Сүхбаатар дүүрэг', 'Баянзүрх дүүрэг', 'Хан-Уул дүүрэг', 'Чингэлтэй дүүрэг'];
const NAMES = ['Болормаа', 'Ганбат', 'Сарантуяа', 'Мөнхбат', 'Оюунчимэг', 'Дэлгэрмаа'];
const STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'DELIVERING',
  'COMPLETED',
  'COMPLETED',
  'COMPLETED',
  'CANCELLED',
];

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);

  console.log('Хуучин өгөгдлийг цэвэрлэж байна...');
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.modifierOption.deleteMany();
  await prisma.modifierGroup.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.restaurantTable.deleteMany();
  await prisma.restaurantRequest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.account.deleteMany();
  await prisma.tenant.deleteMany();

  // Платформын админ — рестораны хүсэлтийг хянана. Ресторанд харьяалагдахгүй.
  await prisma.account.create({
    data: {
      name: 'Платформ админ',
      email: 'admin@hool.mn',
      phone: '99000000',
      passwordHash,
      isPlatformAdmin: true,
    },
  });

  // Нэг харилцагчийн данс — бүх ресторанд гишүүнчлэлтэй болно.
  const demoCustomer = await prisma.account.create({
    data: {
      name: 'Түвшин',
      email: 'hereglegch@hool.mn',
      phone: '99112233',
      passwordHash,
    },
  });

  for (const t of tenants) {
    const tenant = await prisma.tenant.create({
      data: {
        slug: t.slug,
        name: t.name,
        tagline: t.tagline,
        description: t.description,
        accentColor: t.accentColor,
        logoUrl: t.logoUrl,
        coverUrl: t.coverUrl,
        phone: t.phone,
        address: t.address,
        deliveryFee: t.deliveryFee,
        minOrder: t.minOrder,
        etaMinutes: t.etaMinutes,
        rating: t.rating,
        category: t.category,
        deliveryEnabled: t.deliveryEnabled ?? true,
        pickupEnabled: t.pickupEnabled ?? true,
      },
    });

    // Эзний платформын данс — нэг данс, тухайн ресторан дээрх гишүүнчлэлтэй.
    const ownerAccount = await prisma.account.create({
      data: {
        name: t.owner.name,
        email: t.owner.email,
        phone: t.phone.replace('-', ''),
        passwordHash,
      },
    });

    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        accountId: ownerAccount.id,
        name: t.owner.name,
        email: t.owner.email,
        phone: t.phone.replace('-', ''),
        role: 'DIRECTOR',
      },
    });

    // Role тус бүрийн dashboard-ийг шууд турших демо ажилтнууд.
    for (const role of ['MANAGER', 'KITCHEN', 'DRIVER'] as const) {
      const email = `${role.toLowerCase()}.${t.slug}@hool.mn`;
      const account = await prisma.account.create({
        data: { name: `${t.name} ${role}`, email, phone: t.phone.replace('-', ''), passwordHash },
      });
      await prisma.user.create({
        data: {
          tenantId: tenant.id, accountId: account.id, name: account.name,
          email, phone: account.phone, role,
        },
      });
    }

    // Демо харилцагч — НЭГ данс, ресторан бүрт гишүүнчлэлтэй.
    // Ингэснээр нэг бүртгэлээр бүх ресторанд хандах загвар харагдана.
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        accountId: demoCustomer.id,
        name: demoCustomer.name,
        email: demoCustomer.email,
        phone: demoCustomer.phone,
        role: 'USER',
      },
    });

    const createdItems: { id: string; price: number; name: string; imageUrl: string | null }[] = [];

    for (const [ci, cat] of t.categories.entries()) {
      const category = await prisma.category.create({
        data: { tenantId: tenant.id, name: cat.name, sortOrder: ci },
      });

      for (const [ii, item] of cat.items.entries()) {
        const created = await prisma.menuItem.create({
          data: {
            tenantId: tenant.id,
            categoryId: category.id,
            name: item.name,
            description: item.description,
            imageUrl: item.imageUrl,
            price: item.price,
            isPopular: item.popular ?? false,
            calories: item.calories,
            prepMinutes: item.prep ?? 15,
            tags: item.tags ?? '',
            sortOrder: ii,
            modifierGroups: {
              create: (item.groups ?? []).map((g, gi) => ({
                name: g.name,
                required: g.required ?? false,
                maxSelect: g.maxSelect ?? 1,
                sortOrder: gi,
                options: {
                  create: g.options.map(([name, priceDelta], oi) => ({
                    name,
                    priceDelta,
                    sortOrder: oi,
                  })),
                },
              })),
            },
          },
        });
        createdItems.push(created);
      }
    }

    // --- Демо захиалгууд: dashboard хоосон харагдахгүйн тулд -------------------
    for (let i = 0; i < 14; i++) {
      const picks = pickSome(createdItems, 1 + Math.floor(Math.random() * 3));
      const lines = picks.map((p) => {
        const quantity = 1 + Math.floor(Math.random() * 2);
        return {
          menuItemId: p.id,
          name: p.name,
          imageUrl: p.imageUrl,
          unitPrice: p.price,
          quantity,
          options: '',
          lineTotal: p.price * quantity,
        };
      });
      const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
      const daysAgo = Math.floor(Math.random() * 6);
      const createdAt = new Date(Date.now() - daysAgo * 864e5 - Math.random() * 36e5 * 10);

      await prisma.order.create({
        data: {
          tenantId: tenant.id,
          orderNo: 1001 + i,
          customerName: NAMES[i % NAMES.length],
          customerPhone: `99${String(100000 + i * 137).slice(0, 6)}`,
          district: DISTRICTS[i % DISTRICTS.length],
          addressLine: `${10 + i}-р байр, ${1 + (i % 9)} тоот`,
          status: i < 4 ? STATUSES[i] : STATUSES[i % STATUSES.length],
          subtotal,
          deliveryFee: t.deliveryFee,
          total: subtotal + t.deliveryFee,
          isPaid: Math.random() > 0.5,
          createdAt,
          items: { create: lines },
        },
      });
    }

    // Тоолуурыг сүүлийн демо дугаар дээр тавина — дараагийн жинхэнэ
    // захиалга 1015-аас үргэлжилнэ.
    await prisma.tenant.update({ where: { id: tenant.id }, data: { orderSeq: 1014 } });

    // --- Ширээ, ширээний захиалга ---------------------------------------------
    const tables = await Promise.all(
      [
        { number: 'A1', capacity: 2 },
        { number: 'A2', capacity: 2 },
        { number: 'B1', capacity: 4 },
        { number: 'B2', capacity: 4 },
        { number: 'C1', capacity: 8 },
      ].map((tbl) =>
        prisma.restaurantTable.create({ data: { ...tbl, tenantId: tenant.id } }),
      ),
    );

    const RES_STATUS = ['PENDING', 'PENDING', 'CONFIRMED', 'SEATED', 'COMPLETED', 'CANCELLED'] as const;
    for (let i = 0; i < 6; i++) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() + (i % 4)); // өнөөдрөөс 3 хоногийн дотор
      await prisma.reservation.create({
        data: {
          tenantId: tenant.id,
          tableId: tables[i % tables.length].id,
          customerName: NAMES[i % NAMES.length],
          customerPhone: `99${String(200000 + i * 311).slice(0, 6)}`,
          partySize: 2 + (i % 4),
          reservedAt: day,
          reservedTime: ['12:00', '13:30', '18:00', '19:30', '20:00', '21:00'][i],
          status: RES_STATUS[i],
          note: i === 0 ? 'Цонхны дэргэд байвал сайн' : null,
        },
      });
    }

    console.log(
      `  ${t.name} — ${createdItems.length} хоол, 14 захиалга, ${tables.length} ширээ, 6 ширээ захиалга`,
    );
  }

  console.log('\nНэвтрэх мэдээлэл (нууц үг бүгд: 123456)');
  for (const t of tenants) console.log(`   ${t.name.padEnd(16)} эзэн: ${t.owner.email}`);
  console.log('   харилцагч: hereglegch@hool.mn (ресторан бүрт)');
  console.log('   платформын админ: admin@hool.mn');
  console.log('\nМөн ижил и-мэйлээр Clerk-д бүртгүүлбэл эрх нь автоматаар холбогдоно.\n');
}

function pickSome<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
