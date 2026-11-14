/**
 * Deterministic demo seed for the Qahwa Coffee House POS.
 *
 * Creates staff, menu, extras, ingredient stock and recipes, customers,
 * discounts, plus 30 days of completed orders and a live board of open orders
 * so the dashboard and reports are backed by real database rows.
 */
import { PrismaClient } from '@prisma/client';
import type { MenuKind, OrderStatus, OrderType, PaymentMethod } from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';

const prisma = new PrismaClient();

export const DEMO_PASSWORD = 'Qahwa@2024';

const DAY = 86_400_000;

let randomState = 20261107;
function random(): number {
  randomState = (randomState * 1664525 + 1013904223) % 4294967296;
  return randomState / 4294967296;
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]!;
}
function between(min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}
function money(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}
function dayStart(offsetDays: number): Date {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(date.getTime() - offsetDays * DAY);
}
function stamp(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}
function withTime(base: Date, hour: number, minute: number): Date {
  return new Date(base.getTime() + hour * 3_600_000 + minute * 60_000);
}

/** Demo Arabic content, keyed by the canonical English name. */
const AR: {
  categories: Record<string, string>;
  categoryDescriptions: Record<string, string>;
  sizes: Record<string, string>;
  toppings: Record<string, string>;
  ingredients: Record<string, string>;
  suppliers: Record<string, string>;
  discounts: Record<string, string>;
  menuItems: Record<string, string>;
  menuDescriptions: Record<string, string>;
} = {
  categories: {
    'Hot Drinks': 'مشروبات ساخنة',
    'Cold Drinks': 'مشروبات باردة',
    'Food & Desserts': 'مأكولات وحلويات',
  },
  categoryDescriptions: {
    'Hot Drinks': 'قهوة مختصة محضّرة طازجة على البخار.',
    'Cold Drinks': 'مشروبات مثلجة منعشة لكل الأوقات.',
    'Food & Desserts': 'مخبوزات طازجة وحلويات تُخبز يوميًا.',
  },
  sizes: {
    Small: 'صغير',
    Regular: 'وسط',
    Large: 'كبير',
  },
  toppings: {
    'Extra Espresso Shot': 'جرعة إسبريسو إضافية',
    'Vanilla Syrup': 'شراب الفانيليا',
    'Caramel Syrup': 'شراب الكراميل',
    'Hazelnut Syrup': 'شراب البندق',
    'Oat Milk Swap': 'تبديل حليب الشوفان',
    'Almond Milk Swap': 'تبديل حليب اللوز',
    'Whipped Cream': 'كريمة مخفوقة',
    'Caramel Drizzle': 'صوص كراميل',
    'Cocoa Dust': 'رشة كاكاو',
    'Cinnamon Dust': 'رشة قرفة',
  },
  ingredients: {
    'Arabica Coffee Beans': 'حبوب قهوة أرابيكا',
    'Decaf Coffee Beans': 'حبوب قهوة منزوعة الكافيين',
    'Whole Milk': 'حليب كامل الدسم',
    'Oat Milk': 'حليب الشوفان',
    'Almond Milk': 'حليب اللوز',
    'Whipping Cream': 'كريمة خفق',
    'Vanilla Syrup': 'شراب الفانيليا',
    'Caramel Syrup': 'شراب الكراميل',
    'Hazelnut Syrup': 'شراب البندق',
    'Chocolate Sauce': 'صوص الشوكولاتة',
    'Cocoa Powder': 'مسحوق الكاكاو',
    'Matcha Powder': 'مسحوق الماتشا',
    Cinnamon: 'قرفة',
    'Baker Flour': 'دقيق المخبوزات',
    'Caster Sugar': 'سكر ناعم',
    'Cultured Butter': 'زبدة مخمرة',
    'Free-range Eggs': 'بيض بلدي',
    'Dark Chocolate Chips': 'رقائق شوكولاتة داكنة',
    'Cream Cheese': 'جبنة كريمية',
    'Croissant Dough': 'عجين الكرواسون',
    'Donut Glaze': 'جليز الدونات',
    'Mixed Berries': 'توت مشكل',
    'Paper Cups 12oz': 'أكواب ورقية ١٢ أونصة',
    'Cup Lids': 'أغطية الأكواب',
    'Cold Cups 16oz': 'أكواب باردة ١٦ أونصة',
    'Takeaway Bags': 'أكياس التيك أواي',
    Napkins: 'مناديل',
  },
  suppliers: {
    'Nile Roasters': 'محامص النيل',
    'Delta Dairy': 'دلتا للألبان',
    'Cairo Syrup Co.': 'القاهرة للشرابات',
    'Maadi Bakery Supply': 'المعادي لمستلزمات المخبوزات',
    'Green Pack Egypt': 'جرين باك مصر',
  },
  discounts: {
    'Morning Ritual 15%': 'طقس الصباح ١٥٪',
    'Student 10%': 'خصم الطلاب ١٠٪',
    'Pastry Pair 20 EGP': 'زوج المخبوزات ٢٠ جنيه',
    'Loyalty Tuesday 12%': 'ثلاثاء الولاء ١٢٪',
  },
  menuItems: {
    Espresso: 'إسبريسو',
    Americano: 'أمريكانو',
    Cappuccino: 'كابتشينو',
    Latte: 'لاتيه',
    Mocha: 'موكا',
    'Flat White': 'فلات وايت',
    'Hot Chocolate': 'شوكولاتة ساخنة',
    'Iced Latte': 'آيس لاتيه',
    'Iced Americano': 'آيس أمريكانو',
    'Iced Mocha': 'آيس موكا',
    Frappuccino: 'فرابتشينو',
    'Cold Brew': 'كولد برو',
    'Iced Matcha': 'آيس ماتشا',
    Croissant: 'كرواسون',
    Muffin: 'مافن',
    Cheesecake: 'تشيز كيك',
    Cookies: 'كوكيز',
    Brownies: 'براونيز',
    Donuts: 'دونات',
  },
  menuDescriptions: {
    Espresso: 'جرعة مركّزة من حبوب أرابيكا محمصة بعناية، بكريما ذهبية غنية.',
    Americano: 'إسبريسو مزدوج مع ماء ساخن نقي لمذاق نظيف ومتوازن.',
    Cappuccino: 'إسبريسو مع حليب مبخّر ورغوة حريرية بسماكة مثالية.',
    Latte: 'إسبريسو ناعم مع حليب مبخّر كريمي ولمسة حلاوة طبيعية.',
    Mocha: 'إسبريسو مع شوكولاتة داكنة وحليب مبخّر وكريمة مخفوقة.',
    'Flat White': 'جرعتا إسبريسو مع حليب مخملي بطبقة رقيقة من الرغوة.',
    'Hot Chocolate': 'شوكولاتة بلجيكية داكنة مع حليب ساخن وكريمة.',
    'Iced Latte': 'إسبريسو بارد مع حليب طازج ومكعبات ثلج، منعش وناعم.',
    'Iced Americano': 'إسبريسو مزدوج فوق الثلج والماء البارد لمذاق منعش.',
    'Iced Mocha': 'شوكولاتة داكنة وإسبريسو مع حليب بارد وثلج.',
    Frappuccino: 'قهوة مخفوقة مع كراميل وكريمة، مثلجة ومليئة بالطاقة.',
    'Cold Brew': 'قهوة منقوعة ببطء ١٨ ساعة، ناعمة بطعم كاكاو خفيف.',
    'Iced Matcha': 'ماتشا يابانية فاخرة مع حليب بارد وثلج.',
    Croissant: 'كرواسون فرنسي بالزبدة، طبقات مقرمشة وقلب طري.',
    Muffin: 'مافن شوكولاتة محبوكة بقطع الشوكولاتة الداكنة.',
    Cheesecake: 'تشيز كيك نيويورك كريمي مع كومبوت التوت الطازج.',
    Cookies: 'كوكيز شوكولاتة داكنة مقرمشة من الأطراف وطرية من الداخل.',
    Brownies: 'براوني شوكولاتة داكنة كثيف مع رشة كاكاو.',
    Donuts: 'دونات طازجة مغطاة بجليز الفانيليا الذهبي.',
  },
};

async function main(): Promise<void> {
  console.log('Seeding Qahwa Coffee House data...');

  await prisma.inventoryMovement.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.orderItemTopping.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.menuItemSize.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.topping.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.category.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      fullName: 'Mariam Adel',
      email: 'admin@qahwa.cafe',
      role: 'ADMIN',
      passwordHash,
    },
  });
  const cashier1 = await prisma.user.create({
    data: {
      username: 'cashier',
      fullName: 'Layla Hassan',
      email: 'layla@qahwa.cafe',
      role: 'CASHIER',
      passwordHash,
    },
  });
  const cashier2 = await prisma.user.create({
    data: {
      username: 'omar',
      fullName: 'Omar Khaled',
      email: 'omar@qahwa.cafe',
      role: 'CASHIER',
      passwordHash,
    },
  });
  await prisma.user.create({
    data: {
      username: 'barista',
      fullName: 'Nadia Farouk',
      email: 'nadia@qahwa.cafe',
      role: 'KITCHEN_STAFF',
      passwordHash,
    },
  });

  const settingsData = {
    name: 'Qahwa Coffee House',
    nameAr: 'قهوة هاوس',
    tagline: 'Your daily dose of happiness.',
    taglineAr: 'جرعتك اليومية من السعادة.',
    address: '24 Road 9, Maadi, Cairo',
    addressAr: '٢٤ شارع ٩، المعادي، القاهرة',
    phone: '+20 2 2358 4410',
    email: 'hello@qahwa.cafe',
    taxRate: '14.00',
    deliveryFee: '25.00',
    maxCashierDiscountPct: '20.00',
    receiptFooter: 'Thank you for choosing Qahwa. Brewed fresh, served with love.',
    receiptFooterAr: 'شكرًا لاختياركم قهوة هاوس. محضّرة طازجة وبكل حب.',
    currency: 'EGP',
  } as const;

  await prisma.restaurantSettings.upsert({
    where: { id: 'default' },
    update: settingsData,
    create: { id: 'default', ...settingsData },
  });

  const supplierRows = [
    ['Nile Roasters', '+20 100 555 0134', 'orders@nileroasters.local', '35 Industrial Zone, Abbassia, Cairo'],
    ['Delta Dairy', '+20 122 444 7710', 'sales@deltadairy.local', 'Agricultural Road, Giza'],
    ['Cairo Syrup Co.', '+20 111 333 2200', 'hello@cairosyrup.local', 'El Obour Market, Cairo'],
    ['Maadi Bakery Supply', '+20 109 888 6622', 'orders@maadibakery.local', 'Road 9, Maadi, Cairo'],
    ['Green Pack Egypt', '+20 106 777 5511', 'sales@greenpack.local', '6th of October Industrial Zone'],
  ] as const;

  const suppliers: Record<string, string> = {};
  for (const [name, phone, email, address] of supplierRows) {
    const row = await prisma.supplier.create({
      data: { name, nameAr: AR.suppliers[name] ?? null, phone, email, address },
    });
    suppliers[name] = row.id;
  }

  const ingredientRows = [
    ['ING-BEANS', 'Arabica Coffee Beans', 'KG', 42, 10, 680, 'Nile Roasters'],
    ['ING-DECAF', 'Decaf Coffee Beans', 'KG', 6, 2, 720, 'Nile Roasters'],
    ['ING-MILK', 'Whole Milk', 'L', 90, 25, 32, 'Delta Dairy'],
    ['ING-OAT', 'Oat Milk', 'L', 38, 10, 68, 'Delta Dairy'],
    ['ING-ALMOND', 'Almond Milk', 'L', 28, 8, 74, 'Delta Dairy'],
    ['ING-CREAM', 'Whipping Cream', 'L', 22, 6, 120, 'Delta Dairy'],
    ['ING-VANILLA', 'Vanilla Syrup', 'L', 12, 4, 180, 'Cairo Syrup Co.'],
    ['ING-CARAMEL', 'Caramel Syrup', 'L', 10, 3, 190, 'Cairo Syrup Co.'],
    ['ING-HAZELNUT', 'Hazelnut Syrup', 'L', 8, 3, 185, 'Cairo Syrup Co.'],
    ['ING-CHOCO', 'Chocolate Sauce', 'KG', 14, 4, 240, 'Cairo Syrup Co.'],
    ['ING-COCOA', 'Cocoa Powder', 'KG', 8, 2, 300, 'Cairo Syrup Co.'],
    ['ING-MATCHA', 'Matcha Powder', 'KG', 3.5, 1, 950, 'Cairo Syrup Co.'],
    ['ING-CINNAMON', 'Cinnamon', 'KG', 2.2, 0.5, 180, 'Cairo Syrup Co.'],
    ['ING-FLOUR', 'Baker Flour', 'KG', 65, 20, 24, 'Maadi Bakery Supply'],
    ['ING-SUGAR', 'Caster Sugar', 'KG', 55, 15, 30, 'Maadi Bakery Supply'],
    ['ING-BUTTER', 'Cultured Butter', 'KG', 24, 8, 230, 'Maadi Bakery Supply'],
    ['ING-EGGS', 'Free-range Eggs', 'PIECE', 180, 60, 5, 'Maadi Bakery Supply'],
    ['ING-CHOC-CHIPS', 'Dark Chocolate Chips', 'KG', 16, 5, 280, 'Maadi Bakery Supply'],
    ['ING-CREAM-CHEESE', 'Cream Cheese', 'KG', 12, 4, 320, 'Maadi Bakery Supply'],
    ['ING-CROISSANT', 'Croissant Dough', 'PACK', 22, 8, 190, 'Maadi Bakery Supply'],
    ['ING-DONUT-GLAZE', 'Donut Glaze', 'KG', 4.5, 2, 150, 'Maadi Bakery Supply'],
    ['ING-BERRIES', 'Mixed Berries', 'KG', 6, 2, 260, 'Maadi Bakery Supply'],
    ['ING-CUP', 'Paper Cups 12oz', 'PACK', 46, 15, 55, 'Green Pack Egypt'],
    ['ING-LID', 'Cup Lids', 'PACK', 38, 12, 30, 'Green Pack Egypt'],
    ['ING-COLD-CUP', 'Cold Cups 16oz', 'PACK', 34, 12, 65, 'Green Pack Egypt'],
    ['ING-BAG', 'Takeaway Bags', 'PACK', 30, 10, 25, 'Green Pack Egypt'],
    ['ING-NAPKIN', 'Napkins', 'PACK', 28, 10, 18, 'Green Pack Egypt'],
  ] as const;

  const ingredients: Record<string, { id: string; unit: string; cost: number }> = {};
  for (const [sku, name, unit, stock, minStock, cost, supplierName] of ingredientRows) {
    const row = await prisma.ingredient.create({
      data: {
        sku,
        name,
        nameAr: AR.ingredients[name] ?? null,
        unit: unit as 'KG' | 'G' | 'L' | 'ML' | 'PIECE' | 'PACK',
        currentStock: stock,
        minStock,
        costPerUnit: money(cost),
        supplierId: suppliers[supplierName]!,
      },
    });
    ingredients[sku] = { id: row.id, unit, cost };
  }

  const toppingRows = [
    ['Extra Espresso Shot', 12, 'ING-BEANS', 0.009],
    ['Vanilla Syrup', 10, 'ING-VANILLA', 0.02],
    ['Caramel Syrup', 10, 'ING-CARAMEL', 0.02],
    ['Hazelnut Syrup', 10, 'ING-HAZELNUT', 0.02],
    ['Oat Milk Swap', 18, 'ING-OAT', 0.16],
    ['Almond Milk Swap', 18, 'ING-ALMOND', 0.16],
    ['Whipped Cream', 12, 'ING-CREAM', 0.035],
    ['Caramel Drizzle', 8, 'ING-CARAMEL', 0.012],
    ['Cocoa Dust', 6, 'ING-COCOA', 0.005],
    ['Cinnamon Dust', 5, 'ING-CINNAMON', 0.004],
  ] as const;

  const toppings: Record<string, { id: string; price: number }> = {};
  let toppingOrder = 0;
  for (const [name, price, sku, qty] of toppingRows) {
    const row = await prisma.topping.create({
      data: {
        name,
        nameAr: AR.toppings[name] ?? null,
        price: money(price),
        ingredientId: ingredients[sku]!.id,
        ingredientQuantity: qty,
        sortOrder: toppingOrder++,
      },
    });
    toppings[name] = { id: row.id, price };
  }

  const categoryRows = [
    ['Hot Drinks', 'Specialty coffee, steamed milk and slow mornings.', 1],
    ['Cold Drinks', 'Iced coffee, cold brew and refreshing matcha.', 2],
    ['Food & Desserts', 'Buttery pastries and small-batch sweets baked daily.', 3],
  ] as const;

  const categories: Record<string, string> = {};
  for (const [name, description, sortOrder] of categoryRows) {
    const row = await prisma.category.create({
      data: {
        name,
        nameAr: AR.categories[name] ?? null,
        description,
        descriptionAr: AR.categoryDescriptions[name] ?? null,
        sortOrder,
      },
    });
    categories[name] = row.id;
  }

  const sizePresets = [
    { name: 'Small', multiplier: 0.8, sortOrder: 1 },
    { name: 'Regular', multiplier: 1, sortOrder: 2 },
    { name: 'Large', multiplier: 1.25, sortOrder: 3 },
  ] as const;

  // Bundled renderer assets (apps/desktop/src/renderer/assets/products).
  const itemImages: Record<string, string> = {
    'HOT-ESPRESSO': 'espresso',
    'HOT-AMERICANO': 'americano',
    'HOT-CAPPUCCINO': 'cappuccino',
    'HOT-LATTE': 'latte',
    'HOT-MOCHA': 'mocha',
    'HOT-FLAT-WHITE': 'flat-white',
    'HOT-CHOCOLATE': 'hot-chocolate',
    'COLD-ICED-LATTE': 'iced-latte',
    'COLD-ICED-AMERICANO': 'iced-americano',
    'COLD-ICED-MOCHA': 'iced-mocha',
    'COLD-FRAPPUCCINO': 'frappuccino',
    'COLD-BREW': 'cold-brew',
    'COLD-MATCHA': 'iced-matcha',
    'FOOD-CROISSANT': 'croissant',
    'FOOD-MUFFIN': 'muffin',
    'FOOD-CHEESECAKE': 'cheesecake',
    'FOOD-COOKIES': 'cookies',
    'FOOD-BROWNIES': 'brownies',
    'FOOD-DONUTS': 'donuts',
  };

  interface ItemSpec {
    sku: string;
    name: string;
    description: string;
    category: string;
    kind: MenuKind;
    prices?: [number, number, number];
    price?: number;
    prepMinutes?: number;
    featured?: boolean;
    recipe?: Array<[string, number]>;
  }

  const cupLines: Array<[string, number]> = [['ING-CUP', 0.02], ['ING-LID', 0.02], ['ING-NAPKIN', 0.01]];
  const coldCupLines: Array<[string, number]> = [['ING-COLD-CUP', 0.02], ['ING-LID', 0.02], ['ING-NAPKIN', 0.01]];
  const bagLines: Array<[string, number]> = [['ING-BAG', 0.005], ['ING-NAPKIN', 0.01]];

  const itemSpecs: ItemSpec[] = [
    {
      sku: 'HOT-ESPRESSO',
      name: 'Espresso',
      description: 'A concentrated shot of single-origin arabica with a golden crema.',
      category: 'Hot Drinks',
      kind: 'HOT_DRINK',
      prices: [45, 55, 65],
      featured: true,
      prepMinutes: 2,
      recipe: [['ING-BEANS', 0.022], ...cupLines],
    },
    {
      sku: 'HOT-AMERICANO',
      name: 'Americano',
      description: 'Double espresso lengthened with hot water for a clean, balanced cup.',
      category: 'Hot Drinks',
      kind: 'HOT_DRINK',
      prices: [55, 65, 75],
      prepMinutes: 3,
      recipe: [['ING-BEANS', 0.02], ...cupLines],
    },
    {
      sku: 'HOT-CAPPUCCINO',
      name: 'Cappuccino',
      description: 'Espresso crowned with steamed milk and a velvet foam cap.',
      category: 'Hot Drinks',
      kind: 'HOT_DRINK',
      prices: [65, 80, 95],
      featured: true,
      prepMinutes: 4,
      recipe: [['ING-BEANS', 0.018], ['ING-MILK', 0.15], ...cupLines],
    },
    {
      sku: 'HOT-LATTE',
      name: 'Latte',
      description: 'Silky steamed milk poured over a smooth espresso base.',
      category: 'Hot Drinks',
      kind: 'HOT_DRINK',
      prices: [70, 85, 100],
      featured: true,
      prepMinutes: 4,
      recipe: [['ING-BEANS', 0.018], ['ING-MILK', 0.22], ...cupLines],
    },
    {
      sku: 'HOT-MOCHA',
      name: 'Mocha',
      description: 'Espresso, dark chocolate and steamed milk finished with cream.',
      category: 'Hot Drinks',
      kind: 'HOT_DRINK',
      prices: [75, 90, 105],
      prepMinutes: 5,
      recipe: [['ING-BEANS', 0.018], ['ING-MILK', 0.18], ['ING-CHOCO', 0.03], ['ING-CREAM', 0.01], ...cupLines],
    },
    {
      sku: 'HOT-FLAT-WHITE',
      name: 'Flat White',
      description: 'Two ristretto shots under a thin layer of velvety microfoam.',
      category: 'Hot Drinks',
      kind: 'HOT_DRINK',
      prices: [70, 85, 100],
      prepMinutes: 4,
      recipe: [['ING-BEANS', 0.022], ['ING-MILK', 0.18], ...cupLines],
    },
    {
      sku: 'HOT-CHOCOLATE',
      name: 'Hot Chocolate',
      description: 'Belgian dark chocolate melted into hot milk with whipped cream.',
      category: 'Hot Drinks',
      kind: 'HOT_DRINK',
      prices: [70, 85, 100],
      prepMinutes: 5,
      recipe: [['ING-COCOA', 0.04], ['ING-MILK', 0.22], ['ING-CHOCO', 0.02], ['ING-CREAM', 0.02], ...cupLines],
    },
    {
      sku: 'COLD-ICED-LATTE',
      name: 'Iced Latte',
      description: 'Chilled espresso and fresh milk over ice, smooth and refreshing.',
      category: 'Cold Drinks',
      kind: 'COLD_DRINK',
      prices: [75, 90, 105],
      featured: true,
      prepMinutes: 3,
      recipe: [['ING-BEANS', 0.02], ['ING-MILK', 0.2], ...coldCupLines],
    },
    {
      sku: 'COLD-ICED-AMERICANO',
      name: 'Iced Americano',
      description: 'Double espresso poured over cold water and ice.',
      category: 'Cold Drinks',
      kind: 'COLD_DRINK',
      prices: [65, 80, 95],
      prepMinutes: 2,
      recipe: [['ING-BEANS', 0.02], ...coldCupLines],
    },
    {
      sku: 'COLD-ICED-MOCHA',
      name: 'Iced Mocha',
      description: 'Dark chocolate, espresso and cold milk shaken over ice.',
      category: 'Cold Drinks',
      kind: 'COLD_DRINK',
      prices: [80, 95, 110],
      prepMinutes: 4,
      recipe: [['ING-BEANS', 0.018], ['ING-MILK', 0.15], ['ING-CHOCO', 0.03], ['ING-CREAM', 0.015], ...coldCupLines],
    },
    {
      sku: 'COLD-FRAPPUCCINO',
      name: 'Frappuccino',
      description: 'Blended coffee, caramel and cream for an icy energy boost.',
      category: 'Cold Drinks',
      kind: 'COLD_DRINK',
      prices: [85, 100, 115],
      featured: true,
      prepMinutes: 5,
      recipe: [['ING-BEANS', 0.02], ['ING-MILK', 0.18], ['ING-CARAMEL', 0.02], ['ING-CREAM', 0.03], ...coldCupLines],
    },
    {
      sku: 'COLD-BREW',
      name: 'Cold Brew',
      description: 'Slow-steeped for eighteen hours, smooth with cocoa undertones.',
      category: 'Cold Drinks',
      kind: 'COLD_DRINK',
      prices: [75, 90, 105],
      prepMinutes: 2,
      recipe: [['ING-BEANS', 0.035], ...coldCupLines],
    },
    {
      sku: 'COLD-MATCHA',
      name: 'Iced Matcha',
      description: 'Ceremonial matcha whisked with cold milk and poured over ice.',
      category: 'Cold Drinks',
      kind: 'COLD_DRINK',
      prices: [85, 100, 115],
      prepMinutes: 4,
      recipe: [['ING-MATCHA', 0.012], ['ING-MILK', 0.22], ...coldCupLines],
    },
    {
      sku: 'FOOD-CROISSANT',
      name: 'Croissant',
      description: 'French butter croissant with crisp, flaky layers.',
      category: 'Food & Desserts',
      kind: 'BAKERY',
      price: 55,
      featured: true,
      prepMinutes: 2,
      recipe: [['ING-CROISSANT', 0.1], ['ING-BUTTER', 0.01], ...bagLines],
    },
    {
      sku: 'FOOD-MUFFIN',
      name: 'Muffin',
      description: 'Chocolate muffin studded with dark chocolate chunks.',
      category: 'Food & Desserts',
      kind: 'BAKERY',
      price: 45,
      prepMinutes: 2,
      recipe: [
        ['ING-FLOUR', 0.06],
        ['ING-SUGAR', 0.04],
        ['ING-BUTTER', 0.03],
        ['ING-EGGS', 0.5],
        ['ING-CHOC-CHIPS', 0.03],
        ...bagLines,
      ],
    },
    {
      sku: 'FOOD-CHEESECAKE',
      name: 'Cheesecake',
      description: 'Creamy New York cheesecake with a fresh berry compote.',
      category: 'Food & Desserts',
      kind: 'DESSERT',
      price: 75,
      featured: true,
      prepMinutes: 2,
      recipe: [
        ['ING-CREAM-CHEESE', 0.09],
        ['ING-SUGAR', 0.03],
        ['ING-EGGS', 0.25],
        ['ING-BUTTER', 0.02],
        ['ING-BERRIES', 0.03],
        ...bagLines,
      ],
    },
    {
      sku: 'FOOD-COOKIES',
      name: 'Cookies',
      description: 'Dark chocolate cookies, crisp at the edges and soft in the middle.',
      category: 'Food & Desserts',
      kind: 'BAKERY',
      price: 35,
      prepMinutes: 1,
      recipe: [
        ['ING-FLOUR', 0.05],
        ['ING-BUTTER', 0.03],
        ['ING-SUGAR', 0.03],
        ['ING-CHOC-CHIPS', 0.04],
        ['ING-EGGS', 0.2],
        ...bagLines,
      ],
    },
    {
      sku: 'FOOD-BROWNIES',
      name: 'Brownies',
      description: 'Dense dark chocolate brownie with a cocoa dust finish.',
      category: 'Food & Desserts',
      kind: 'BAKERY',
      price: 55,
      prepMinutes: 1,
      recipe: [
        ['ING-CHOCO', 0.04],
        ['ING-COCOA', 0.01],
        ['ING-BUTTER', 0.04],
        ['ING-SUGAR', 0.04],
        ['ING-FLOUR', 0.03],
        ['ING-EGGS', 0.4],
        ...bagLines,
      ],
    },
    {
      sku: 'FOOD-DONUTS',
      name: 'Donuts',
      description: 'Fresh ring donut dipped in a golden vanilla glaze.',
      category: 'Food & Desserts',
      kind: 'BAKERY',
      price: 40,
      prepMinutes: 1,
      recipe: [
        ['ING-FLOUR', 0.04],
        ['ING-SUGAR', 0.02],
        ['ING-BUTTER', 0.02],
        ['ING-EGGS', 0.2],
        ['ING-DONUT-GLAZE', 0.03],
        ...bagLines,
      ],
    },
  ];

  const menuItems: Record<
    string,
    {
      id: string;
      name: string;
      kind: string;
      basePrice: number;
      cost: number;
      hasSizes: boolean;
      sizeIds: string[];
      sizeNames: string[];
      sizePrices: number[];
      sizeMultipliers: number[];
    }
  > = {};

  for (const spec of itemSpecs) {
    const categoryId = categories[spec.category]!;
    const hasSizes = Boolean(spec.prices);
    const basePrice = spec.prices ? spec.prices[1]! : spec.price!;
    const item = await prisma.menuItem.create({
      data: {
        sku: spec.sku,
        name: spec.name,
        nameAr: AR.menuItems[spec.name] ?? null,
        description: spec.description,
        descriptionAr: AR.menuDescriptions[spec.name] ?? null,
        categoryId,
        kind: spec.kind,
        basePrice: money(basePrice),
        prepMinutes: spec.prepMinutes ?? 4,
        isFeatured: spec.featured ?? false,
        imageUrl: itemImages[spec.sku] ? `qahwa-asset:${itemImages[spec.sku]}` : null,
        hasSizes,
        sizes: hasSizes
          ? {
              create: sizePresets.map((preset, index) => ({
                name: preset.name,
                nameAr: AR.sizes[preset.name] ?? null,
                price: money(spec.prices![index]!),
                ingredientMultiplier: preset.multiplier,
                isDefault: preset.name === 'Regular',
                sortOrder: preset.sortOrder,
              })),
            }
          : undefined,
      },
      include: { sizes: true },
    });

    let cost = 0;
    if (spec.recipe) {
      const recipe = await prisma.recipe.create({ data: { menuItemId: item.id } });
      for (const [sku, qty] of spec.recipe) {
        await prisma.recipeItem.create({
          data: { recipeId: recipe.id, ingredientId: ingredients[sku]!.id, quantity: qty },
        });
        cost += ingredients[sku]!.cost * qty;
      }
      await prisma.menuItem.update({ where: { id: item.id }, data: { costPrice: money(cost) } });
    }

    menuItems[spec.sku] = {
      id: item.id,
      name: item.name,
      kind: item.kind,
      basePrice,
      cost: Math.round(cost * 100) / 100,
      hasSizes,
      sizeIds: item.sizes.map((size) => size.id),
      sizeNames: item.sizes.map((size) => size.name),
      sizePrices: item.sizes.map((size) => Number(size.price)),
      sizeMultipliers: item.sizes.map((size) => Number(size.ingredientMultiplier)),
    };
  }

  const customerRows = [
    ['Nour El Din', '+20 100 111 2233', '14 Sharia 26 July, Zamalek', 'Oat milk in every latte'],
    ['Salma Adel', '+20 101 222 3344', '5 Road 9, Maadi', null],
    ['Youssef Farouk', '+20 102 333 4455', '22 El Nasr Road, Nasr City', 'Decaf after 6pm'],
    ['Mariam Hany', '+20 106 444 5566', '8 Ahmed Orabi, Mohandessin', null],
    ['Karim Tarek', '+20 109 555 6677', '31 Baghdad Street, Korba', 'Call on arrival'],
    ['Dina Sami', '+20 111 666 7788', '7 Sphinx Street, Heliopolis', 'No added sugar'],
    ['Ahmed Mostafa', '+20 112 777 8899', '19 Peace Road, New Cairo', 'Corporate account'],
    ['Hala Wagih', '+20 114 888 9900', '3 El Batal Ahmed, Agouza', null],
    ['Tamer Fouad', '+20 115 999 0011', '40 Abbas El Akkad, Nasr City', null],
    ['Rana Ibrahim', '+20 116 121 3141', '11 Syria Street, Mohandessin', 'Extra hot, no foam'],
    ['Omar Sherif', '+20 117 232 4252', '6 Nile Street, Giza', null],
    ['Farida Nabil', '+20 118 343 5363', '27 Road 200, Degla', 'Almond milk'],
    ['Ali Gamal', '+20 119 454 6474', '2 Makram Ebeid, Nasr City', 'Delivery after 8pm'],
    ['Laila Hosny', '+20 120 565 7585', '16 Thawra Street, Heliopolis', null],
  ] as const;

  const customers = [];
  for (const [name, phone, address, notes] of customerRows) {
    const row = await prisma.customer.create({ data: { name, phone, address, notes } });
    customers.push(row);
  }

  const discountRows = [
    ['Morning Ritual 15%', 'PERCENT', '15.00'],
    ['Student 10%', 'PERCENT', '10.00'],
    ['Pastry Pair 20 EGP', 'FIXED', '20.00'],
    ['Loyalty Tuesday 12%', 'PERCENT', '12.00'],
  ] as const;
  const discounts = await Promise.all(
    discountRows.map(([name, type, value]) =>
      prisma.discount.create({
        data: { name, nameAr: AR.discounts[name] ?? null, type, value },
      }),
    ),
  );

  const recipeRows = await prisma.recipe.findMany({
    include: { items: { include: { ingredient: true } } },
  });
  const recipeMap: Record<string, Array<{ ingredientId: string; quantity: number; unitCost: number }>> = {};
  for (const recipe of recipeRows) {
    recipeMap[recipe.menuItemId] = recipe.items.map((line) => ({
      ingredientId: line.ingredientId,
      quantity: Number(line.quantity),
      unitCost: Number(line.ingredient.costPerUnit),
    }));
  }

  const drinkSkus = Object.keys(menuItems).filter(
    (sku) => menuItems[sku]!.kind === 'HOT_DRINK' || menuItems[sku]!.kind === 'COLD_DRINK',
  );
  const foodSkus = Object.keys(menuItems).filter(
    (sku) => menuItems[sku]!.kind === 'BAKERY' || menuItems[sku]!.kind === 'DESSERT',
  );
  const toppingNames = Object.keys(toppings);
  const cashiers = [cashier1, cashier2];
  const orderCounters: Record<string, number> = {};

  function nextSequence(date: Date): number {
    const key = stamp(date);
    orderCounters[key] = (orderCounters[key] ?? 0) + 1;
    return orderCounters[key]!;
  }

  function round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  interface OrderOptions {
    date: Date;
    status: OrderStatus;
    type: OrderType;
    cashierId: string;
    withInvoice: boolean;
  }

  async function createOrder(options: OrderOptions) {
    const seq = nextSequence(options.date);
    const dayKey = stamp(options.date);
    const orderNumber = 'ORD-' + dayKey + '-' + String(seq).padStart(4, '0');
    const invoiceNumber = 'INV-' + dayKey + '-' + String(seq).padStart(4, '0');

    const chosen = [] as Array<{ sku: string; sizeIndex: number; quantity: number; toppingNames: string[] }>;
    const itemCount = between(1, 4);
    for (let i = 0; i < itemCount; i += 1) {
      const useDrink = random() < 0.82;
      const sku = useDrink ? pick(drinkSkus) : pick(foodSkus);
      const item = menuItems[sku]!;
      const sizeIndex = item.hasSizes ? between(0, 2) : 0;
      const quantity = between(1, 2);
      const selectedToppings: string[] = [];
      if (useDrink) {
        const toppingCount = random() < 0.55 ? 0 : between(1, 2);
        while (selectedToppings.length < toppingCount) {
          const name = pick(toppingNames);
          if (!selectedToppings.includes(name)) selectedToppings.push(name);
        }
      }
      chosen.push({ sku, sizeIndex, quantity, toppingNames: selectedToppings });
    }

    let subtotal = 0;
    const prepared = chosen.map((selection) => {
      const item = menuItems[selection.sku]!;
      const unitPrice = item.hasSizes ? item.sizePrices[selection.sizeIndex]! : item.basePrice;
      const toppingPrice = selection.toppingNames.reduce((sum, name) => sum + toppings[name]!.price, 0);
      const lineTotal = round2((unitPrice + toppingPrice) * selection.quantity);
      subtotal += lineTotal;

      const multiplier = item.hasSizes ? item.sizeMultipliers[selection.sizeIndex]! : 1;
      const recipe = recipeMap[item.id] ?? [];
      let unitCost = recipe.reduce((sum, line) => sum + line.quantity * line.unitCost * multiplier, 0);
      const movementLines = recipe.map((line) => ({
        ingredientId: line.ingredientId,
        quantity: -line.quantity * multiplier * selection.quantity,
        unitCost: line.unitCost,
        note: item.name,
      }));
      for (const name of selection.toppingNames) {
        const toppingRow = toppingRows.find((row) => row[0] === name)!;
        const ingredient = ingredients[toppingRow[2]]!;
        unitCost += toppingRow[3] * ingredient.cost;
        movementLines.push({
          ingredientId: ingredient.id,
          quantity: -toppingRow[3] * selection.quantity,
          unitCost: ingredient.cost,
          note: 'Extra: ' + name,
        });
      }

      return {
        item,
        sizeIndex: selection.sizeIndex,
        quantity: selection.quantity,
        unitPrice,
        toppingPrice,
        lineTotal,
        unitCost: round2(unitCost),
        toppingNames: selection.toppingNames,
        movementLines,
      };
    });

    subtotal = round2(subtotal);
    let discountAmount = 0;
    let discountLabel: string | null = null;
    let discountLabelAr: string | null = null;
    let discountId: string | null = null;
    if (random() < 0.28) {
      const discount = pick(discounts);
      discountAmount =
        discount.type === 'PERCENT'
          ? round2((subtotal * Number(discount.value)) / 100)
          : Math.min(Number(discount.value), subtotal);
      discountLabel = discount.name;
      discountLabelAr = AR.discounts[discount.name] ?? null;
      discountId = discount.id;
    }

    const taxable = Math.max(subtotal - discountAmount, 0);
    const tax = round2(taxable * 0.14);
    const deliveryFee = options.type === 'DELIVERY' ? 25 : 0;
    const total = round2(taxable + tax + deliveryFee);
    const method: PaymentMethod = random() < 0.5 ? 'CASH' : random() < 0.8 ? 'CARD' : 'WALLET';
    const amountPaid = method === 'CASH' ? Math.ceil(total / 5) * 5 : total;
    const changeDue = round2(amountPaid - total);
    const customer = random() < 0.6 ? pick(customers) : null;
    const type = options.type;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        type,
        status: options.status,
        customerId: customer?.id ?? null,
        customerName: customer?.name ?? null,
        customerPhone: customer?.phone ?? null,
        customerAddress:
          type === 'DELIVERY' ? customer?.address ?? '24 Road 9, Maadi' : null,
        tableNumber: type === 'DINE_IN' ? String(between(1, 12)) : null,
        cashierId: options.cashierId,
        subtotal: money(subtotal),
        discount: money(discountAmount),
        discountLabel,
        discountLabelAr,
        discountId,
        tax: money(tax),
        deliveryFee: money(deliveryFee),
        total: money(total),
        amountPaid: money(amountPaid),
        changeDue: money(changeDue),
        paymentMethod: method,
        paymentStatus: 'PAID',
        inventoryDeducted: options.status === 'COMPLETED',
        completedAt: options.status === 'COMPLETED' ? options.date : null,
        createdAt: options.date,
        items: {
          create: prepared.map((line) => ({
            menuItemId: line.item.id,
            menuItemName: line.item.name,
            menuItemNameAr: AR.menuItems[line.item.name] ?? null,
            sizeId: line.item.hasSizes ? line.item.sizeIds[line.sizeIndex]! : null,
            sizeName: line.item.hasSizes ? line.item.sizeNames[line.sizeIndex]! : null,
            sizeNameAr: line.item.hasSizes
              ? (AR.sizes[line.item.sizeNames[line.sizeIndex]!] ?? null)
              : null,
            quantity: line.quantity,
            unitPrice: money(line.unitPrice),
            toppingsTotal: money(line.toppingPrice),
            lineTotal: money(line.lineTotal),
            unitCost: money(line.unitCost),
            toppings: {
              create: line.toppingNames.map((name) => ({
                toppingId: toppings[name]!.id,
                name,
                nameAr: AR.toppings[name] ?? null,
                price: money(toppings[name]!.price),
              })),
            },
          })),
        },
      },
      include: { items: true },
    });

    await prisma.payment.create({ data: { orderId: order.id, method, amount: money(total) } });

    if (options.withInvoice) {
      await prisma.invoice.create({
        data: { orderId: order.id, invoiceNumber, issuedAt: options.date },
      });
    }

    if (options.status === 'COMPLETED') {
      const movements = prepared.flatMap((line) =>
        line.movementLines.map((movement) => ({
          ingredientId: movement.ingredientId,
          orderId: order.id,
          type: 'SALE_DEDUCTION' as const,
          quantity: movement.quantity.toFixed(3),
          unitCost: money(movement.unitCost),
          note: movement.note,
          userId: options.cashierId,
          createdAt: options.date,
        })),
      );
      if (movements.length > 0) {
        await prisma.inventoryMovement.createMany({ data: movements });
      }
    }

    return order;
  }

  console.log('Generating 30 days of order history...');
  for (let offset = 30; offset >= 1; offset -= 1) {
    const day = dayStart(offset);
    const ordersToday = between(12, 26);
    for (let i = 0; i < ordersToday; i += 1) {
      const typeRoll = random();
      const type: OrderType =
        typeRoll < 0.4 ? 'DELIVERY' : typeRoll < 0.72 ? 'TAKEAWAY' : 'DINE_IN';
      await createOrder({
        date: withTime(day, between(8, 21), between(0, 59)),
        status: 'COMPLETED',
        type,
        cashierId: pick(cashiers).id,
        withInvoice: true,
      });
    }
  }

  console.log("Generating today's completed and open orders...");
  const now = new Date();
  const todayStart = dayStart(0);
  function todayAt(hoursAgo: number, minutesAgo: number): Date {
    const value = new Date(now.getTime() - hoursAgo * 3_600_000 - minutesAgo * 60_000);
    return value.getTime() < todayStart.getTime() ? new Date(todayStart.getTime() + 3_600_000) : value;
  }

  for (let i = 0; i < 10; i += 1) {
    const typeRoll = random();
    const type: OrderType =
      typeRoll < 0.45 ? 'DELIVERY' : typeRoll < 0.75 ? 'TAKEAWAY' : 'DINE_IN';
    await createOrder({
      date: todayAt(between(1, 6), between(0, 59)),
      status: 'COMPLETED',
      type,
      cashierId: pick(cashiers).id,
      withInvoice: true,
    });
  }

  const openStatuses: OrderStatus[] = ['PENDING', 'PENDING', 'CONFIRMED', 'PREPARING', 'PREPARING', 'READY'];
  let openIndex = 0;
  for (const status of openStatuses) {
    const typeRoll = random();
    const type: OrderType =
      typeRoll < 0.45 ? 'DELIVERY' : typeRoll < 0.75 ? 'TAKEAWAY' : 'DINE_IN';
    await createOrder({
      date: todayAt(0, between(5, 50) + openIndex * 4),
      status,
      type,
      cashierId: pick(cashiers).id,
      withInvoice: false,
    });
    openIndex += 1;
  }

  const purchaseSkus = ['ING-BEANS', 'ING-MILK', 'ING-OAT', 'ING-CROISSANT', 'ING-BUTTER'];
  for (const sku of purchaseSkus) {
    const ingredient = ingredients[sku]!;
    await prisma.inventoryMovement.create({
      data: {
        ingredientId: ingredient.id,
        type: 'PURCHASE',
        quantity: sku === 'ING-BEANS' ? '15.000' : '25.000',
        unitCost: money(ingredient.cost),
        reference: 'PO-2026-' + sku.slice(4),
        note: 'Weekly stock replenishment',
        userId: admin.id,
        createdAt: dayStart(12),
      },
    });
  }

  const lowStock: Record<string, string> = {
    'ING-MATCHA': '0.600',
    'ING-CARAMEL': '1.200',
    'ING-DONUT-GLAZE': '1.600',
    'ING-BERRIES': '3.000',
  };
  for (const [sku, stock] of Object.entries(lowStock)) {
    await prisma.ingredient.update({ where: { id: ingredients[sku]!.id }, data: { currentStock: stock } });
  }

  const counts = {
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    menuItems: await prisma.menuItem.count(),
    toppings: await prisma.topping.count(),
    ingredients: await prisma.ingredient.count(),
    customers: await prisma.customer.count(),
    orders: await prisma.order.count(),
    invoices: await prisma.invoice.count(),
  };
  console.log('Seed complete:', counts);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
