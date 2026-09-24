// 1500 -> "1,500 EGP" (English) / "1,500 ج.م" (Arabic)
export const money = (value, isArabic) =>
  `${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${isArabic ? "ج.م" : "EGP"}`;
