/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const translations = {
  en: {
    home: "Home", shop: "Shop", categories: "Categories", arrivals: "New Arrivals", about: "About",
    favorites: "Favorites", cart: "Cart", login: "Login", createAccount: "Create Account", profile: "My Profile", logout: "Logout",
    search: "Search for products...", announcement: "Free Shipping on Orders Over EGP", newCollection: "NEW COLLECTION",
    heroTitle: "A Story in Every Home", heroText: "Discover feminine essentials, loungewear, lingerie, beauty and accessories made to make you feel beautiful.",
    shopCollection: "Shop Collection", exploreCategories: "Explore Categories", shopByCategory: "SHOP BY CATEGORY", findFavorite: "Find Your Favorite",
    categoryText: "Everything feminine, carefully selected for you.", bestSellers: "Best Sellers", curated: "CURATED FOR YOU", shopAll: "Shop All Categories",
    language: "العربية", inEveryHome: "A story in every home", trustSince: "Trusted since 1995", collection: "THE COLLECTION", explore: "EXPLORE",
    justIn: "JUST IN", storeFresh: "Fresh pieces, new moods, same Al Dalouaa feeling.", findNext: "Find your next favorite piece.", pickMood: "Pick a mood, find a piece.",
    products: "products", all: "All", shopLabel: "SHOP", addToCart: "Add to Cart", addedToCart: "Added to Cart", quantity: "Quantity", color: "Color", size: "Size",
    shade: "Shade", scent: "Scent", related: "Related Products", youMayLike: "YOU MAY ALSO LIKE", productNotFound: "Product Not Found", backHome: "Go back to the homepage",
    feminineEssentials: "Feminine essentials, selected with love.", ourStory: "Our Story", backTop: "Back to top", soldOut: "Sold out", favorite: "Favorite", addToWishlist: "Add to wishlist",
    yourBag: "YOUR BAG", shoppingCart: "Shopping Cart", item: "item", items: "items", selectedForYou: "selected for you.", emptyCartTitle: "Your cart is feeling a little empty",
    emptyCartText: "Let's fix that. Discover something beautiful and add it to your bag.", startShopping: "Start Shopping", option: "Option", continueShopping: "Continue Shopping",
    orderSummary: "Order Summary", subtotal: "Subtotal", shipping: "Shipping", free: "Free", total: "Total", proceedCheckout: "Proceed to Checkout", freeShipping: "Free shipping on orders over 2000 EGP.",
    checkout: "Checkout", deliveryDetails: "Delivery Details", paymentMethod: "Payment Method", vodafoneCash: "Vodafone Cash", cashOnDelivery: "Cash on Delivery",
    secureCardPayment: "Secure Card Payment", securePaymentText: "Secure payment is handled by the payment gateway.", yourOrder: "Your Order", payment: "Payment", orderPlaced: "ORDER PLACED",
    almostYours: "ALMOST YOURS", completeDelivery: "Please complete all delivery details.", enterVodafone: "Please enter the Vodafone Cash number you paid from.", enterTransaction: "Please enter the transaction ID.", uploadPayment: "Please upload a screenshot of your payment.",
    account: "My Account", welcomeBack: "Welcome back", personalInfo: "Personal Information", managePersonal: "Manage your personal information.", fullName: "Full Name", email: "Email", phone: "Phone Number", saveChanges: "Save Changes",
    myOrders: "My Orders", trackOrders: "Track and manage your orders.", noOrders: "No orders yet", ordersAppear: "Your orders will appear here.", myFavorites: "My Favorites", savedLater: "Products you saved for later.", noFavorites: "No favorites yet", startAdding: "Start adding products to your favorites.",
    myAddresses: "My Addresses", manageAddresses: "Manage your shipping addresses.", noAddresses: "No addresses yet", addAddress: "Add an address for faster checkout.", changePassword: "Change Password", secureAccount: "Keep your account secure.", currentPassword: "Current Password", newPassword: "New Password", confirmNewPassword: "Confirm New Password", updatePassword: "Update Password",
    welcome: "WELCOME BACK", accessFavorites: "Access your favorites, cart and orders.", emailAddress: "Email Address", password: "Password", yourPassword: "Your password", hidePassword: "Hide password", showPassword: "Show password", loggingIn: "Logging in...", or: "OR", continueGoogle: "Continue with Google", noAccount: "Don't have an account?", createOne: "Create one", backToShop: "Back to Shop",
    join: "JOIN AL DALOUAA", saveTrack: "Save favorites, track orders and checkout faster.", yourFullName: "Your full name", atLeast6: "At least 8 characters", reenterPassword: "Re-enter your password", creating: "Creating...", alreadyAccount: "Already have an account?",
    passwordMismatch: "Passwords do not match.", passwordLength: "Password must be at least 8 characters.", unableCreate: "Unable to create account.", unableLogin: "Unable to login. Check your email and password.", googleSignIn: "Google Sign-In needs your Google OAuth Client ID on the backend. The button is ready for the real Google flow.", googleSignUp: "Google Sign-Up needs your Google OAuth Client ID on the backend. The button is ready for the real Google flow.",
    searchResults: "SEARCH RESULTS", noSearchResults: "No products found", searchBrowse: "Try another search or browse our full collection.",
    oops: "Oops, this page got away", pageMissing: "The page you're looking for doesn't exist or has moved.",
    aboutEyebrow: "OUR STORY", aboutTitle: "Made for the girl who loves being herself.", aboutText: "Al Dalouaa is a feminine lifestyle destination bringing together elegant fashion, comfort, beauty and little things that make everyday moments feel special.", exploreCollection: "Explore the Collection", feminine: "Feminine", feminineText: "Soft details, beautiful colors and pieces chosen with intention.", curatedValue: "Curated", curatedText: "A focused collection instead of endless scrolling.", forYou: "For You", forYouText: "Designed around the way modern women actually shop and live.",
    comingSoon: "This page is being built in the next step. Stay tuned 🌸", decrease: "Decrease quantity", increase: "Increase quantity", toggleFavorite: "Toggle favorite", emptyFavoritesAlt: "Empty favorites", emptyCartAlt: "Empty cart", discoverFavorites: "Discover Favorites"
  },
  ar: {
    home: "الرئيسية", shop: "المتجر", categories: "الأقسام", arrivals: "وصل حديثًا", about: "عن الدلوعة", favorites: "المفضلة", cart: "السلة", login: "تسجيل الدخول", createAccount: "إنشاء حساب", profile: "حسابي", logout: "تسجيل الخروج",
    search: "ابحثي عن منتج...", announcement: "شحن مجاني للطلبات فوق 2000 جنيه", newCollection: "المجموعة الجديدة", heroTitle: "لينا جوا كل بيت حكاية", heroText: "اكتشفي اختيارات أنثوية من ملابس البيت واللانجيري والبيوتي والإكسسوارات، مختارة علشان تخليكي دايمًا أجمل.", shopCollection: "تسوقي المجموعة", exploreCategories: "اكتشفي الأقسام", shopByCategory: "تسوقي حسب القسم", findFavorite: "اختاري المفضل ليكي", categoryText: "كل حاجة أنثوية، مختارة بعناية علشانك.", bestSellers: "الأكثر مبيعًا", curated: "مختارات ليكي", shopAll: "كل الأقسام", language: "English",
    inEveryHome: "لينا جوا كل بيت حكاية", trustSince: "ثقة منذ 1995", collection: "المجموعة", explore: "اكتشفي", justIn: "وصل حديثًا", storeFresh: "قطع جديدة، أجواء جديدة، ونفس إحساس الدلوعة.", findNext: "اختاري القطعة المفضلة ليكي.", pickMood: "اختاري مودك وقطعتك.", products: "منتجات", all: "الكل", shopLabel: "تسوقي", addToCart: "أضيفي للسلة", addedToCart: "تمت الإضافة للسلة", quantity: "الكمية", color: "اللون", size: "المقاس", shade: "الدرجة", scent: "الرائحة", related: "منتجات مشابهة", youMayLike: "ممكن يعجبك كمان", productNotFound: "المنتج غير موجود", backHome: "العودة للصفحة الرئيسية", feminineEssentials: "اختيارات أنثوية مختارة بحب.", ourStory: "حكايتنا", backTop: "العودة للأعلى", soldOut: "نفدت الكمية", favorite: "المفضلة", addToWishlist: "أضيفي للمفضلة",
    yourBag: "سلتك", shoppingCart: "سلة المشتريات", item: "منتج", items: "منتجات", selectedForYou: "مختارة ليكي.", emptyCartTitle: "السلة فاضية شوية", emptyCartText: "يلا نغير ده. اكتشفي حاجة جميلة وضيفيها لسلتك.", startShopping: "ابدئي التسوق", option: "الاختيار", continueShopping: "كملي التسوق", orderSummary: "ملخص الطلب", subtotal: "المجموع الفرعي", shipping: "الشحن", free: "مجاني", total: "الإجمالي", proceedCheckout: "إتمام الشراء", freeShipping: "شحن مجاني للطلبات فوق 2000 جنيه.",
    checkout: "إتمام الطلب", deliveryDetails: "بيانات التوصيل", paymentMethod: "طريقة الدفع", vodafoneCash: "فودافون كاش", cashOnDelivery: "الدفع عند الاستلام", yourOrder: "طلبك", payment: "الدفع", orderPlaced: "تم تأكيد الطلب", almostYours: "فاضلك خطوة وتكون ليكي", completeDelivery: "من فضلك كملي كل بيانات التوصيل.", enterVodafone: "من فضلك اكتبي رقم فودافون كاش اللي دفعتي منه.", enterTransaction: "من فضلك اكتبي رقم العملية.", uploadPayment: "من فضلك ارفعي صورة إثبات الدفع.",
    account: "حسابي", welcomeBack: "أهلًا بيكي تاني", personalInfo: "البيانات الشخصية", managePersonal: "عدلي بياناتك الشخصية.", fullName: "الاسم بالكامل", email: "البريد الإلكتروني", phone: "رقم الهاتف", saveChanges: "حفظ التغييرات", myOrders: "طلباتي", trackOrders: "تابعي طلباتك وإدارتها.", noOrders: "مفيش طلبات لسه", ordersAppear: "طلباتك هتظهر هنا.", myFavorites: "المفضلة", savedLater: "المنتجات اللي حفظتيها لوقت تاني.", noFavorites: "مفيش مفضلات لسه", startAdding: "ابدئي بإضافة المنتجات للمفضلة.", myAddresses: "عناويني", manageAddresses: "إدارة عناوين التوصيل.", noAddresses: "مفيش عناوين لسه", addAddress: "ضيفي عنوان علشان تكملي الطلب أسرع.", changePassword: "تغيير كلمة المرور", secureAccount: "حافظي على أمان حسابك.", currentPassword: "كلمة المرور الحالية", newPassword: "كلمة المرور الجديدة", confirmNewPassword: "تأكيد كلمة المرور الجديدة", updatePassword: "تحديث كلمة المرور",
    welcome: "أهلًا بيكي تاني", accessFavorites: "وصلي للمفضلة والسلة والطلبات بسهولة.", emailAddress: "البريد الإلكتروني", password: "كلمة المرور", yourPassword: "اكتبي كلمة المرور", hidePassword: "إخفاء كلمة المرور", showPassword: "إظهار كلمة المرور", loggingIn: "جاري تسجيل الدخول...", or: "أو", continueGoogle: "المتابعة باستخدام Google", noAccount: "معندكيش حساب؟", createOne: "اعملي حساب", backToShop: "العودة للمتجر", join: "انضمي للدلوعة", saveTrack: "احفظي المفضلة، تابعي الطلبات وكملي الشراء أسرع.", yourFullName: "اكتبي اسمك بالكامل", atLeast6: "8 أحرف على الأقل", reenterPassword: "أعيدي كتابة كلمة المرور", creating: "جاري إنشاء الحساب...", alreadyAccount: "عندك حساب بالفعل؟", passwordMismatch: "كلمتا المرور غير متطابقتين.", passwordLength: "كلمة المرور لازم تكون 8 أحرف على الأقل.", unableCreate: "مش قادرين ننشئ الحساب دلوقتي.", unableLogin: "تعذر تسجيل الدخول. تأكدي من البريد الإلكتروني وكلمة المرور.", googleSignIn: "تسجيل الدخول بـ Google يحتاج إعداد Google OAuth على الـBackend. الزر جاهز للربط الحقيقي.", googleSignUp: "التسجيل بـ Google يحتاج إعداد Google OAuth على الـBackend. الزر جاهز للربط الحقيقي.",
    searchResults: "نتائج البحث", noSearchResults: "مفيش منتجات لاقيناها", searchBrowse: "جربي بحث تاني أو تصفحي كل المنتجات.", oops: "عفوًا، الصفحة هربت مننا", pageMissing: "الصفحة اللي بتدوري عليها مش موجودة أو اتنقلت.", aboutEyebrow: "حكايتنا", aboutTitle: "للبنت اللي بتحب تكون على طبيعتها.", aboutText: "الدلوعة مساحة أنثوية بتجمع بين الموضة الأنيقة والراحة والجمال والتفاصيل الصغيرة اللي بتخلي كل يوم أحلى.", exploreCollection: "اكتشفي المجموعة", feminine: "أنثوية", feminineText: "تفاصيل ناعمة، ألوان جميلة وقطع مختارة بعناية.", curatedValue: "مختارة بعناية", curatedText: "مجموعة مركزة بدل التصفح من غير نهاية.", forYou: "علشانك", forYouText: "مصممة على طريقة تسوق واحتياجات الستات في حياتهم اليومية.", comingSoon: "الصفحة دي بنجهزها للخطوة الجاية. استنينا 🌸", decrease: "تقليل الكمية", increase: "زيادة الكمية", toggleFavorite: "تبديل المفضلة", emptyFavoritesAlt: "المفضلة فاضية", emptyCartAlt: "السلة فاضية", discoverFavorites: "اكتشفي المفضلة"
  }
};

const optionTranslations = {
  "Rose Pink": "وردي روز", "Ivory White": "أبيض عاجي", Black: "أسود", "Blush Pink": "وردي هادي", Beige: "بيج", Grey: "رمادي", Gold: "ذهبي", Silver: "فضي", "Rose Gold": "ذهبي روز", "Nude Rose": "نيود روز", "Classic Red": "أحمر كلاسيك", Berry: "توتي", Terracotta: "تيراكوتا", "Vanilla Bloom": "فانيليا بلوم", "Rose Musk": "مسك الورد", "Citrus Breeze": "نسمة حمضيات", "White Jasmine": "ياسمين أبيض"
};

const categoryTranslations = { Galabiyas: "جلاليب", Pajamas: "بيجامات", "Nightwear & Lingerie": "قمصان نوم ولانجيري", Makeup: "ميكب", Accessories: "إكسسوارات", Swimwear: "مايوهات", Underwear: "ملابس داخلية" };

const LanguageContext = createContext(null);
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("dalouaa_language") || "ar");
  useEffect(() => { localStorage.setItem("dalouaa_language", language); document.documentElement.lang = language; document.documentElement.dir = language === "ar" ? "rtl" : "ltr"; document.body.classList.toggle("rtl", language === "ar"); }, [language]);
  const value = useMemo(() => {
    const isArabic = language === "ar";
    const pick = (en, ar) => (isArabic ? ar : en);
    return {
      language,
      isArabic,
      setLanguage,
      pick,
      t: (key) => translations[language]?.[key] ?? translations.en[key] ?? key,
      toggleLanguage: () => setLanguage((v) => (v === "ar" ? "en" : "ar")),
      // names coming from the database (products, categories, colours, governorates)
      categoryName: (name) => (isArabic ? categoryTranslations[name] || name : name),
      optionName: (name) => (isArabic ? optionTranslations[name] || name : name),
      nameOf: (item) => (!item ? "" : isArabic ? item.nameAr || item.name || "" : item.name || item.nameAr || ""),
      descOf: (item) => (!item ? "" : isArabic ? item.descriptionAr || item.description || "" : item.description || item.descriptionAr || ""),
      categoryLabel: (category) =>
        !category ? "" : isArabic ? category.nameAr || categoryTranslations[category.name] || category.name : category.name,
      colorLabel: (color) =>
        !color ? "" : isArabic ? color.nameAr || optionTranslations[color.name] || color.name : color.name,
      zoneName: (zone) => (!zone ? "" : isArabic ? zone.nameAr : zone.nameEn || zone.nameAr),
      money: (amount) =>
        `${Number(amount || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${isArabic ? "ج.م" : "EGP"}`,
      formatDate: (value) =>
        value
          ? new Date(value).toLocaleDateString(isArabic ? "ar-EG-u-nu-latn" : "en-GB", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "",
    };
  }, [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage() { return useContext(LanguageContext); }
