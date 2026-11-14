-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "descriptionAr" TEXT,
ADD COLUMN     "nameAr" TEXT;

-- AlterTable
ALTER TABLE "discounts" ADD COLUMN     "nameAr" TEXT;

-- AlterTable
ALTER TABLE "ingredients" ADD COLUMN     "nameAr" TEXT;

-- AlterTable
ALTER TABLE "menu_item_sizes" ADD COLUMN     "nameAr" TEXT;

-- AlterTable
ALTER TABLE "menu_items" ADD COLUMN     "descriptionAr" TEXT,
ADD COLUMN     "nameAr" TEXT;

-- AlterTable
ALTER TABLE "order_item_toppings" ADD COLUMN     "nameAr" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "menuItemNameAr" TEXT,
ADD COLUMN     "sizeNameAr" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "discountLabelAr" TEXT;

-- AlterTable
ALTER TABLE "restaurant_settings" ADD COLUMN     "addressAr" TEXT,
ADD COLUMN     "nameAr" TEXT,
ADD COLUMN     "receiptFooterAr" TEXT,
ADD COLUMN     "taglineAr" TEXT;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "nameAr" TEXT;

-- AlterTable
ALTER TABLE "toppings" ADD COLUMN     "nameAr" TEXT;

-- Backfill the demo catalogue that shipped before bilingual support.
UPDATE "restaurant_settings" SET
  "nameAr" = 'فورنو للبيتزا',
  "taglineAr" = 'بيتزا على الحطب، بسرعة.',
  "addressAr" = '١٢ كورنيش النيل، الزمالك، القاهرة',
  "receiptFooterAr" = 'شكرًا لاختياركم فورنو. مخبوزة طازجة وبكل حب.'
WHERE "id" = 'default';

UPDATE "suppliers" SET "nameAr" = 'القاهرة للمنتجات الطازجة' WHERE "name" = 'Cairo Fresh Produce';
UPDATE "suppliers" SET "nameAr" = 'النيل للألبان والأجبان' WHERE "name" = 'Nile Dairy & Cheese';

UPDATE "categories" SET "nameAr" = 'بيتزا كلاسيكية', "descriptionAr" = 'وصفات أصيلة تُخبز في فرن الحطب.' WHERE "name" = 'Classic Pizzas';
UPDATE "categories" SET "nameAr" = 'بيتزا مميزة', "descriptionAr" = 'إبداعات الشيف مع إضافات فاخرة.' WHERE "name" = 'Special Pizzas';
UPDATE "categories" SET "nameAr" = 'بيتزا الدجاج', "descriptionAr" = 'بيتزا بالدجاج المشوي مع صوصات غنية.' WHERE "name" = 'Chicken Pizzas';
UPDATE "categories" SET "nameAr" = 'بيتزا اللحوم', "descriptionAr" = 'محشوة باللحم البقري والسجق والبيبروني.' WHERE "name" = 'Meat Pizzas';
UPDATE "categories" SET "nameAr" = 'بيتزا المأكولات البحرية', "descriptionAr" = 'طازجة من البحر المتوسط.' WHERE "name" = 'Seafood Pizzas';
UPDATE "categories" SET "nameAr" = 'بيتزا نباتية', "descriptionAr" = 'إضافات طازجة من الحديقة، بدون لحوم.' WHERE "name" = 'Vegetarian Pizzas';
UPDATE "categories" SET "nameAr" = 'مقبلات', "descriptionAr" = 'مقبلات مثالية للمشاركة.' WHERE "name" = 'Appetizers';
UPDATE "categories" SET "nameAr" = 'أطباق جانبية', "descriptionAr" = 'الرفيق المثالي لكل بيتزا.' WHERE "name" = 'Sides';
UPDATE "categories" SET "nameAr" = 'حلويات', "descriptionAr" = 'نهاية حلوة لوجبتك.' WHERE "name" = 'Desserts';
UPDATE "categories" SET "nameAr" = 'مشروبات', "descriptionAr" = 'مشروبات مثلجة وعصائر طازجة.' WHERE "name" = 'Drinks';
UPDATE "categories" SET "nameAr" = 'صوصات', "descriptionAr" = 'صوصات إضافية للأطراف والأطباق الجانبية.' WHERE "name" = 'Sauces';

UPDATE "menu_item_sizes" SET "nameAr" = 'صغير' WHERE "name" = 'Small';
UPDATE "menu_item_sizes" SET "nameAr" = 'وسط' WHERE "name" = 'Medium';
UPDATE "menu_item_sizes" SET "nameAr" = 'كبير' WHERE "name" = 'Large';
UPDATE "menu_item_sizes" SET "nameAr" = 'جامبو' WHERE "name" = 'Extra Large';

UPDATE "toppings" SET "nameAr" = 'موزاريلا إضافية' WHERE "name" = 'Extra Mozzarella';
UPDATE "toppings" SET "nameAr" = 'مشروم' WHERE "name" = 'Mushrooms';
UPDATE "toppings" SET "nameAr" = 'زيتون أسود' WHERE "name" = 'Black Olives';
UPDATE "toppings" SET "nameAr" = 'بيبروني' WHERE "name" = 'Pepperoni';
UPDATE "toppings" SET "nameAr" = 'دجاج مشوي' WHERE "name" = 'Grilled Chicken';
UPDATE "toppings" SET "nameAr" = 'سجق إيطالي' WHERE "name" = 'Italian Sausage';
UPDATE "toppings" SET "nameAr" = 'خضروات طازجة' WHERE "name" = 'Fresh Vegetables';
UPDATE "toppings" SET "nameAr" = 'هالبينو وفلفل حار' WHERE "name" = 'Jalapeno and Chili';
UPDATE "toppings" SET "nameAr" = 'جبنة فيتا' WHERE "name" = 'Feta Cheese';
UPDATE "toppings" SET "nameAr" = 'لحم بقري مفروم' WHERE "name" = 'Beef Mince';
UPDATE "toppings" SET "nameAr" = 'جمبري' WHERE "name" = 'Shrimp';
UPDATE "toppings" SET "nameAr" = 'زيت الكمأة' WHERE "name" = 'Truffle Oil';
UPDATE "toppings" SET "nameAr" = 'صوص باربكيو' WHERE "name" = 'BBQ Drizzle';

UPDATE "ingredients" SET "nameAr" = 'دقيق البيتزا' WHERE "name" = 'Pizza Flour';
UPDATE "ingredients" SET "nameAr" = 'صلصة طماطم' WHERE "name" = 'Tomato Sauce';
UPDATE "ingredients" SET "nameAr" = 'جبنة موزاريلا' WHERE "name" = 'Mozzarella Cheese';
UPDATE "ingredients" SET "nameAr" = 'جبنة بارميزان' WHERE "name" = 'Parmesan';
UPDATE "ingredients" SET "nameAr" = 'جبنة شيدر' WHERE "name" = 'Cheddar';
UPDATE "ingredients" SET "nameAr" = 'جبنة فيتا' WHERE "name" = 'Feta Cheese';
UPDATE "ingredients" SET "nameAr" = 'بيبروني' WHERE "name" = 'Pepperoni';
UPDATE "ingredients" SET "nameAr" = 'لحم بقري مفروم' WHERE "name" = 'Beef Mince';
UPDATE "ingredients" SET "nameAr" = 'سجق إيطالي' WHERE "name" = 'Italian Sausage';
UPDATE "ingredients" SET "nameAr" = 'دجاج مشوي' WHERE "name" = 'Grilled Chicken';
UPDATE "ingredients" SET "nameAr" = 'جمبري' WHERE "name" = 'Shrimp';
UPDATE "ingredients" SET "nameAr" = 'تونة' WHERE "name" = 'Tuna';
UPDATE "ingredients" SET "nameAr" = 'مشروم' WHERE "name" = 'Mushrooms';
UPDATE "ingredients" SET "nameAr" = 'زيتون أسود' WHERE "name" = 'Black Olives';
UPDATE "ingredients" SET "nameAr" = 'فلفل ألوان' WHERE "name" = 'Bell Peppers';
UPDATE "ingredients" SET "nameAr" = 'بصل' WHERE "name" = 'Onion';
UPDATE "ingredients" SET "nameAr" = 'سبانخ' WHERE "name" = 'Spinach';
UPDATE "ingredients" SET "nameAr" = 'طماطم طازجة' WHERE "name" = 'Fresh Tomato';
UPDATE "ingredients" SET "nameAr" = 'ريحان طازج' WHERE "name" = 'Fresh Basil';
UPDATE "ingredients" SET "nameAr" = 'ثوم' WHERE "name" = 'Garlic';
UPDATE "ingredients" SET "nameAr" = 'رقائق فلفل حار' WHERE "name" = 'Chili Flakes';
UPDATE "ingredients" SET "nameAr" = 'زيت الكمأة' WHERE "name" = 'Truffle Oil';
UPDATE "ingredients" SET "nameAr" = 'صوص باربكيو' WHERE "name" = 'BBQ Sauce';
UPDATE "ingredients" SET "nameAr" = 'صوص حار' WHERE "name" = 'Hot Sauce';
UPDATE "ingredients" SET "nameAr" = 'زيت طهي' WHERE "name" = 'Cooking Oil';
UPDATE "ingredients" SET "nameAr" = 'بطاطس' WHERE "name" = 'Potatoes';
UPDATE "ingredients" SET "nameAr" = 'علب بيتزا' WHERE "name" = 'Pizza Boxes';
UPDATE "ingredients" SET "nameAr" = 'مناديل' WHERE "name" = 'Napkins';

UPDATE "discounts" SET "nameAr" = 'خصم الطلاب ١٠٪' WHERE "name" = 'Student 10%';
UPDATE "discounts" SET "nameAr" = 'وجبة الموظفين ١٥٪' WHERE "name" = 'Staff Meal 15%';
UPDATE "discounts" SET "nameAr" = 'افتتاح كبير ٢٠ جنيه' WHERE "name" = 'Grand Opening 20 EGP';
UPDATE "discounts" SET "nameAr" = 'ثلاثاء العائلة ١٢٪' WHERE "name" = 'Family Tuesday 12%';

UPDATE "menu_items" SET "nameAr" = 'مارغريتا', "descriptionAr" = 'صلصة طماطم سان مارزانو، موزاريلا فيور دي لاتي، ريحان طازج، وزيت زيتون.' WHERE "name" = 'Margherita';
UPDATE "menu_items" SET "nameAr" = 'بيبروني كلاسيك', "descriptionAr" = 'بيبروني مضاعف وموزاريلا ولمسة فلفل حار على عجينتنا المميزة.' WHERE "name" = 'Pepperoni Classic';
UPDATE "menu_items" SET "nameAr" = 'كواترو فورماجي', "descriptionAr" = 'موزاريلا وبارميزان وشيدر وفيتا على قاعدة بيضاء كريمية.' WHERE "name" = 'Quattro Formaggi';
UPDATE "menu_items" SET "nameAr" = 'فونجي', "descriptionAr" = 'مشروم مشوي وموزاريلا وزعتر على صلصة الطماطم.' WHERE "name" = 'Funghi';
UPDATE "menu_items" SET "nameAr" = 'فورنو سيجنتشر', "descriptionAr" = 'بيبروني وسجق إيطالي وفلفل وزيتون مع الموزاريلا.' WHERE "name" = 'Forno Signature';
UPDATE "menu_items" SET "nameAr" = 'مشروم الكمأة', "descriptionAr" = 'مشروم بري وزيت كمأة وبارميزان وموزاريلا.' WHERE "name" = 'Truffle Mushroom';
UPDATE "menu_items" SET "nameAr" = 'ديافولا حارة', "descriptionAr" = 'بيبروني حار ورقائق فلفل ولمسة عسل حار.' WHERE "name" = 'Spicy Diavola';
UPDATE "menu_items" SET "nameAr" = 'دجاج باربكيو', "descriptionAr" = 'صوص باربكيو مدخن ودجاج مشوي وبصل أحمر وموزاريلا.' WHERE "name" = 'BBQ Chicken';
UPDATE "menu_items" SET "nameAr" = 'دجاج بافلو', "descriptionAr" = 'صوص بافلو حار ودجاج مشوي وموزاريلا وصوص رانش.' WHERE "name" = 'Buffalo Chicken';
UPDATE "menu_items" SET "nameAr" = 'دجاج رانش', "descriptionAr" = 'قاعدة رانش كريمية ودجاج مشوي وذرة حلوة وموزاريلا.' WHERE "name" = 'Chicken Ranch';
UPDATE "menu_items" SET "nameAr" = 'عشاق اللحوم', "descriptionAr" = 'لحم بقري وسجق إيطالي وبيبروني وموزاريلا إضافية.' WHERE "name" = 'Meat Lovers';
UPDATE "menu_items" SET "nameAr" = 'بيف سوبريم', "descriptionAr" = 'لحم بقري متبل وفلفل وبصل وموزاريلا.' WHERE "name" = 'Beef Supreme';
UPDATE "menu_items" SET "nameAr" = 'جمبري سكامبي', "descriptionAr" = 'جمبري بالثوم وموزاريلا وطماطم وعصرة ليمون.' WHERE "name" = 'Shrimp Scampi';
UPDATE "menu_items" SET "nameAr" = 'تونة وزيتون', "descriptionAr" = 'تونة وزيتون أسود وبصل أحمر وموزاريلا.' WHERE "name" = 'Tuna and Olives';
UPDATE "menu_items" SET "nameAr" = 'خضار الحديقة', "descriptionAr" = 'فلفل ومشروم وبصل أحمر وطماطم طازجة وموزاريلا.' WHERE "name" = 'Garden Veggie';
UPDATE "menu_items" SET "nameAr" = 'سبانخ وفيتا', "descriptionAr" = 'سبانخ سوتيه وفيتا وموزاريلا وزيت ثوم.' WHERE "name" = 'Spinach and Feta';
UPDATE "menu_items" SET "nameAr" = 'خبز بالثوم', "descriptionAr" = 'خبز مسطح على الحطب مدهون بزبدة الثوم والأعشاب.' WHERE "name" = 'Garlic Bread';
UPDATE "menu_items" SET "nameAr" = 'أصابع موزاريلا', "descriptionAr" = 'موزاريلا مقلية ذهبية مع صوص مارينارا.' WHERE "name" = 'Mozzarella Sticks';
UPDATE "menu_items" SET "nameAr" = 'أجنحة بافلو', "descriptionAr" = 'ستة أجنحة مقرمشة بصوص بافلو مع صوص رانش.' WHERE "name" = 'Buffalo Wings';
UPDATE "menu_items" SET "nameAr" = 'بروشيتا طماطم', "descriptionAr" = 'خبز محمص وطماطم طازجة وريحان وزيت زيتون.' WHERE "name" = 'Tomato Bruschetta';
UPDATE "menu_items" SET "nameAr" = 'بطاطس مقلية', "descriptionAr" = 'بطاطس مقلية متبلة ومقرمشة مع أيولي الثوم.' WHERE "name" = 'French Fries';
UPDATE "menu_items" SET "nameAr" = 'حلقات بصل', "descriptionAr" = 'حلقات بصل مقرمشة مع صوص تشيبوتلي.' WHERE "name" = 'Onion Rings';
UPDATE "menu_items" SET "nameAr" = 'سلطة سيزر', "descriptionAr" = 'خس روميني وبارميزان وخبز محمص وصوص سيزر كريمي.' WHERE "name" = 'Caesar Salad';
UPDATE "menu_items" SET "nameAr" = 'كول سلو', "descriptionAr" = 'سلطة ملفوف مقرمشة مع صوص لاذع.' WHERE "name" = 'Coleslaw';
UPDATE "menu_items" SET "nameAr" = 'كيك الشوكولاتة اللافا', "descriptionAr" = 'كيك شوكولاتة دافئ بقلب سائل.' WHERE "name" = 'Chocolate Lava Cake';
UPDATE "menu_items" SET "nameAr" = 'تشيز كيك نيويورك', "descriptionAr" = 'تشيز كيك مخبوز كلاسيكي مع كومبوت التوت.' WHERE "name" = 'New York Cheesecake';
UPDATE "menu_items" SET "nameAr" = 'تيراميسو', "descriptionAr" = 'أصابع بسكويت مغموسة بالإسبريسو وكريمة الماسكاربوني.' WHERE "name" = 'Tiramisu';
UPDATE "menu_items" SET "nameAr" = 'مشروب غازي ٣٣٠ مل', "descriptionAr" = 'مشروب غازي مثلج.' WHERE "name" = 'Soft Drink 330ml';
UPDATE "menu_items" SET "nameAr" = 'مياه فوارة', "descriptionAr" = 'مياه معدنية فوارة ٥٠٠ مل.' WHERE "name" = 'Sparkling Water';
UPDATE "menu_items" SET "nameAr" = 'ليمونادة طازجة', "descriptionAr" = 'ليمونادة معصورة يدويًا مع النعناع.' WHERE "name" = 'Fresh Lemonade';
UPDATE "menu_items" SET "nameAr" = 'شاي مثلج', "descriptionAr" = 'شاي مثلج بالخوخ محضر في المطعم.' WHERE "name" = 'Iced Tea';
UPDATE "menu_items" SET "nameAr" = 'صوص الثوم', "descriptionAr" = 'صوص ثوم مشوي كريمي.' WHERE "name" = 'Garlic Dip';
UPDATE "menu_items" SET "nameAr" = 'صوص رانش', "descriptionAr" = 'صوص رانش بالأعشاب واللبن.' WHERE "name" = 'Ranch Dip';
UPDATE "menu_items" SET "nameAr" = 'صوص حار', "descriptionAr" = 'صوص حار خاص بالمطعم.' WHERE "name" = 'Hot Sauce';
UPDATE "menu_items" SET "nameAr" = 'صوص باربكيو', "descriptionAr" = 'صوص باربكيو مدخن.' WHERE "name" = 'BBQ Dip';

-- Snapshot columns: backfill historical order lines from the catalogue.
UPDATE "order_items" AS oi
SET "menuItemNameAr" = mi."nameAr"
FROM "menu_items" AS mi
WHERE oi."menuItemId" = mi."id" AND oi."menuItemNameAr" IS NULL;

UPDATE "order_items" AS oi
SET "sizeNameAr" = ms."nameAr"
FROM "menu_item_sizes" AS ms
WHERE oi."sizeId" = ms."id" AND oi."sizeNameAr" IS NULL;

UPDATE "order_item_toppings" AS oit
SET "nameAr" = t."nameAr"
FROM "toppings" AS t
WHERE oit."toppingId" = t."id" AND oit."nameAr" IS NULL;

UPDATE "orders" AS o
SET "discountLabelAr" = d."nameAr"
FROM "discounts" AS d
WHERE o."discountLabel" = d."name" AND o."discountLabelAr" IS NULL;
