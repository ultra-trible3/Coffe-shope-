import type { Language } from '@pharmacy/shared';

/**
 * User-facing API error messages are thrown as English literals throughout the
 * domain modules. Translating them at the response boundary keeps a single
 * source of truth in the services while still honouring the request language.
 */
const ARABIC_MESSAGES: Record<string, string> = {
  'A category with that name already exists': 'توجد فئة بهذا الاسم بالفعل',
  'A topping with that name already exists': 'توجد إضافة بهذا الاسم بالفعل',
  'Account is inactive': 'الحساب غير نشط',
  'Add at least one size when the item is sold by size':
    'أضف مقاسًا واحدًا على الأقل عندما يُباع الصنف بالمقاس',
  'Another user already updated this order. Refresh and try again.':
    'قام مستخدم آخر بتحديث هذا الطلب. حدّث الصفحة وحاول مرة أخرى.',
  'At least one active administrator must remain': 'يجب أن يبقى مسؤول واحد نشط على الأقل',
  'Cash received is less than the order total': 'المبلغ المستلم أقل من إجمالي الطلب',
  'Category not found': 'الفئة غير موجودة',
  'Completed orders cannot be cancelled': 'لا يمكن إلغاء الطلبات المكتملة',
  'Could not allocate an order number, please retry':
    'تعذّر تخصيص رقم طلب، يرجى المحاولة مرة أخرى',
  'Customer not found': 'العميل غير موجود',
  'Database error': 'خطأ في قاعدة البيانات',
  'Dates must use YYYY-MM-DD format': 'يجب أن تكون التواريخ بصيغة YYYY-MM-DD',
  'Discount not found': 'الخصم غير موجود',
  'Incorrect username or password': 'اسم المستخدم أو كلمة المرور غير صحيحة',
  'Ingredient not found': 'المكوّن غير موجود',
  'Invalid access token': 'رمز الدخول غير صالح',
  'Invalid database request': 'طلب قاعدة بيانات غير صالح',
  'Invoice not found for this order': 'لا توجد فاتورة لهذا الطلب',
  'Invoice not found': 'الفاتورة غير موجودة',
  'Malformed JSON payload': 'بيانات JSON غير صالحة',
  'Menu item not found': 'صنف القائمة غير موجود',
  'Move or delete the menu items in this category first':
    'انقل أو احذف أصناف القائمة في هذه الفئة أولاً',
  'One or more ingredients do not exist': 'مكوّن واحد أو أكثر غير موجود',
  'One or more menu items are no longer available': 'صنف قائمة واحد أو أكثر لم يعد متاحًا',
  'One or more selected toppings are unavailable': 'إضافة واحدة أو أكثر من المحددة غير متاحة',
  'Only one size can be the default': 'يمكن أن يكون مقاس واحد فقط هو الافتراضي',
  'Operation blocked by existing references': 'العملية محظورة بسبب مراجع موجودة',
  'Order not found': 'الطلب غير موجود',
  'Please sign in to continue': 'يرجى تسجيل الدخول للمتابعة',
  'Reference not found (invalid relation)': 'المرجع غير موجود (علاقة غير صالحة)',
  'Resource not found': 'المورد غير موجود',
  'Select a valid category': 'اختر فئة صالحة',
  'Select a valid customer': 'اختر عميلاً صالحًا',
  'Select a valid ingredient': 'اختر مكوّنًا صالحًا',
  'Select a valid supplier': 'اختر مورّدًا صالحًا',
  'Session expired, please sign in again': 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى',
  'Size names must be unique': 'يجب أن تكون أسماء المقاسات فريدة',
  'Supplier not found': 'المورّد غير موجود',
  'That discount is no longer available': 'هذا الخصم لم يعد متاحًا',
  'The amount charged must match the order total': 'يجب أن يطابق المبلغ المحصّل إجمالي الطلب',
  'The current password is incorrect': 'كلمة المرور الحالية غير صحيحة',
  'The data conflicts with an existing record': 'البيانات تتعارض مع سجل موجود',
  'The new password must be different from the current one':
    'يجب أن تختلف كلمة المرور الجديدة عن الحالية',
  'The order changed while you were updating it. Refresh and try again.':
    'تغيّر الطلب أثناء تحديثه. حدّث الصفحة وحاول مرة أخرى.',
  'The order is already in that status': 'الطلب في هذه الحالة بالفعل',
  'The requested record was not found': 'السجل المطلوب غير موجود',
  'The start date must be before the end date':
    'يجب أن يكون تاريخ البداية قبل تاريخ النهاية',
  'The submitted data is invalid': 'البيانات المرسلة غير صالحة',
  'There is not enough stock available': 'المخزون المتاح غير كافٍ',
  'This account is disabled': 'هذا الحساب معطّل',
  'This account is disabled. Contact an administrator.':
    'هذا الحساب معطّل. تواصل مع المسؤول.',
  'This ingredient is used by recipes, toppings or stock history. Deactivate it instead.':
    'هذا المكوّن مستخدم في الوصفات أو الإضافات أو سجل المخزون. عطّله بدلاً من ذلك.',
  'This item appears on past orders. Mark it unavailable instead of deleting it.':
    'يظهر هذا الصنف في طلبات سابقة. اجعله غير متاح بدلاً من حذفه.',
  'This order is already cancelled': 'هذا الطلب ملغى بالفعل',
  'This order was already processed. Refresh and try again.':
    'تمت معالجة هذا الطلب بالفعل. حدّث الصفحة وحاول مرة أخرى.',
  'This supplier is linked to ingredients. Deactivate it instead.':
    'هذا المورّد مرتبط بمكوّنات. عطّله بدلاً من ذلك.',
  'Topping not found': 'الإضافة غير موجودة',
  'Unexpected server error': 'خطأ غير متوقع في الخادم',
  'Use Change password to update your own password':
    'استخدم تغيير كلمة المرور لتحديث كلمة مرورك',
  'User not found': 'المستخدم غير موجود',
  'Validation failed': 'فشل التحقق من البيانات',
  'You can only access your own orders': 'يمكنك الوصول إلى طلباتك فقط',
  'You cannot change your own administrator role': 'لا يمكنك تغيير دور المسؤول الخاص بك',
  'You cannot deactivate your own account': 'لا يمكنك تعطيل حسابك',
  'You cannot deactivate your own administrator account':
    'لا يمكنك تعطيل حساب المسؤول الخاص بك',
  'You do not have permission to perform this action': 'لا تملك صلاحية لتنفيذ هذا الإجراء',
  'Your role does not have access to this area': 'دورك لا يملك صلاحية الوصول إلى هذا القسم',
  'Your session is no longer valid. Please sign in again.':
    'جلستك لم تعد صالحة. يرجى تسجيل الدخول مرة أخرى.',
};

const ARABIC_PATTERNS: ReadonlyArray<[RegExp, (match: RegExpMatchArray) => string]> = [
  [/^Missing permissions: (.+)$/, (m) => `الصلاحيات المفقودة: ${m[1]}`],
  [/^Username is already taken: (.+)$/, (m) => `اسم المستخدم مستخدم بالفعل: ${m[1]}`],
  [/^Duplicate value: (.+)$/, (m) => `قيمة مكررة: ${m[1]}`],
  [/^Route not found: (.+)$/, (m) => `المسار غير موجود: ${m[1]}`],
  [/^(.+) is currently marked as sold out$/, (m) => `${m[1]} مُعلَّم حاليًا على أنه نفد`],
  [
    /^Cannot move an order from (.+) to (.+)$/,
    (m) => `لا يمكن نقل الطلب من ${m[1]} إلى ${m[2]}`,
  ],
  [
    /^That phone number is already saved for (.+)$/,
    (m) => `رقم الهاتف هذا محفوظ بالفعل لـ ${m[1]}`,
  ],
  [
    /^This customer has (\d+) orders and cannot be deleted$/,
    (m) => `لدى هذا العميل ${m[1]} طلبات ولا يمكن حذفه`,
  ],
  [/^(.+) is not sold by size$/, (m) => `${m[1]} لا يُباع بالمقاس`],
  [/^Choose a size for (.+)$/, (m) => `اختر مقاسًا لـ ${m[1]}`],
  [/^Reports cover at most (\d+) days$/, (m) => `تغطي التقارير ${m[1]} يومًا كحد أقصى`],
  [/^That size is not available for (.+)$/, (m) => `هذا المقاس غير متاح لـ ${m[1]}`],
];

export function localizeErrorMessage(message: string, language: Language): string {
  if (language !== 'ar') return message;
  const exact = ARABIC_MESSAGES[message];
  if (exact) return exact;
  for (const [pattern, format] of ARABIC_PATTERNS) {
    const match = message.match(pattern);
    if (match) return format(match);
  }
  return message;
}
