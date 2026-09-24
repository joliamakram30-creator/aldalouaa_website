// The API answers in English. Turn its messages into Arabic when the site is in Arabic.
const AR = [
  [/Google sign-in failed/i, "تعذر تسجيل الدخول بجوجل، جربي تاني."],
  [/Google email address is not verified/i, "إيميل جوجل ده مش متأكد منه."],
  [/Google sign-in is not configured/i, "تسجيل الدخول بجوجل غير مفعّل حاليًا."],
  [/Invalid email or password/i, "البريد الإلكتروني أو كلمة المرور غير صحيحة."],
  [/Email already exists/i, "البريد الإلكتروني ده مسجل قبل كده."],
  [/valid email/i, "من فضلك اكتبي بريد إلكتروني صحيح."],
  [/Password must be between/i, "كلمة المرور لازم تكون من 8 لـ 72 حرف."],
  [/valid Egyptian mobile/i, "من فضلك اكتبي رقم موبايل مصري صحيح (01XXXXXXXXX)."],
  [/Current password is incorrect/i, "كلمة المرور الحالية غير صحيحة."],
  [/Too many attempts/i, "محاولات كتير، جربي تاني بعد شوية."],
  [/Account no longer exists|Invalid or expired token|Authentication required/i, "لازم تسجلي الدخول تاني."],
  [/Please select a size/i, "من فضلك اختاري المقاس."],
  [/Please select a color/i, "من فضلك اختاري اللون."],
  [/size is not available|color is not available/i, "الاختيار ده مش متاح."],
  [/out of stock/i, "المنتج ده نفدت كميته."],
  [/Only (\d+) available/i, "المتاح من المنتج ده في المخزون كمية محدودة."],
  [/Not enough stock/i, "الكمية المطلوبة أكبر من المتاح في المخزون."],
  [/no longer available|not available/i, "المنتج ده مش متاح حاليًا."],
  [/cart is empty/i, "السلة فاضية."],
  [/full name/i, "من فضلك اكتبي اسمك بالكامل."],
  [/delivery address/i, "من فضلك اكتبي عنوان التوصيل بالكامل."],
  [/select your governorate/i, "من فضلك اختاري المحافظة."],
  [/Delivery is not available/i, "التوصيل غير متاح للمحافظة دي حاليًا."],
  [/payment method/i, "من فضلك اختاري طريقة دفع صحيحة."],
  [/Vodafone Cash number/i, "من فضلك اكتبي رقم فودافون كاش اللي دفعتي منه."],
  [/transaction ID/i, "من فضلك اكتبي رقم العملية."],
  [/Payment proof/i, "من فضلك ارفعي صورة إثبات الدفع."],
  [/choose the size\/color again/i, "من فضلك اختاري المقاس واللون تاني."],
  [/can no longer be cancelled/i, "الطلب ده مينفعش يتلغي من هنا، تواصلي مع المتجر."],
  [/Only JPG, PNG, WEBP or GIF/i, "الصور لازم تكون JPG أو PNG أو WEBP أو GIF."],
  [/5 MB or smaller/i, "حجم كل صورة لازم يكون 5 ميجا أو أقل."],
  [/Too many images|up to 10 images/i, "الحد الأقصى 10 صور."],
  [/Network Error|timeout/i, "مش قادرين نوصل للسيرفر. تأكدي من الاتصال وجربي تاني."],
];

export function apiErrorMessage(error, isArabic, fallback) {
  const raw = error?.response?.data?.message || error?.message || "";

  if (!error?.response) {
    return isArabic ? AR[AR.length - 1][1] : "Cannot reach the server. Check your connection and try again.";
  }

  if (!isArabic) return raw || fallback || "Something went wrong";

  for (const [pattern, text] of AR) {
    if (pattern.test(raw)) return text;
  }
  return fallback || "حصلت مشكلة، جربي تاني.";
}
