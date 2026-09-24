// Reference data used by the seed scripts.

const categories = [
  { name: "Galabiyas", nameAr: "جلاليب", slug: "galabiyas", image: "galabiyas.jpg" },
  { name: "Pajamas", nameAr: "بيجامات", slug: "pajamas", image: "pajamas.jpg" },
  { name: "Nightwear & Lingerie", nameAr: "قمصان نوم ولانجيري", slug: "nightwear-lingerie", image: "lingerie.jpg" },
  { name: "Makeup", nameAr: "ميكب", slug: "makeup", image: "makeup.jpg" },
  { name: "Accessories", nameAr: "إكسسوارات", slug: "accessories", image: "accessories.jpg" },
  { name: "Swimwear", nameAr: "مايوهات", slug: "swimwear", image: "swimwear.jpg" },
  { name: "Underwear", nameAr: "ملابس داخلية", slug: "underwear", image: "underwear.jpg" },
];

const sizes = ["S", "M", "L", "XL", "XXL", "Free Size"];

const colors = [
  { name: "Rose Pink", nameAr: "وردي روز", hexCode: "#d94f70" },
  { name: "Ivory White", nameAr: "أبيض عاجي", hexCode: "#faf5f0" },
  { name: "Black", nameAr: "أسود", hexCode: "#2b2525" },
  { name: "White", nameAr: "أبيض", hexCode: "#ffffff" },
  { name: "Blush Pink", nameAr: "وردي هادي", hexCode: "#f2c6d3" },
  { name: "Beige", nameAr: "بيج", hexCode: "#e8d9c8" },
  { name: "Grey", nameAr: "رمادي", hexCode: "#a9a2a2" },
  { name: "Red", nameAr: "أحمر", hexCode: "#c0392b" },
  { name: "Blue", nameAr: "أزرق", hexCode: "#3d6fb6" },
  { name: "Green", nameAr: "أخضر", hexCode: "#4f8a5b" },
  { name: "Gold", nameAr: "ذهبي", hexCode: "#c9a24a" },
  { name: "Silver", nameAr: "فضي", hexCode: "#b9bcc2" },
];

// Same list as the migration (price = shipping cost in EGP)
const shippingZones = [
  ["الإسكندرية", "Alexandria", 45],
  ["القاهرة", "Cairo", 90],
  ["الجيزة", "Giza", 90],
  ["أطراف القاهرة والجيزة", "Cairo & Giza Outskirts", 110],
  ["البحيرة", "Beheira", 100],
  ["الغربية", "Gharbia", 100],
  ["الشرقية", "Sharqia", 100],
  ["القليوبية", "Qalyubia", 100],
  ["كفر الشيخ", "Kafr El Sheikh", 100],
  ["المنوفية", "Monufia", 100],
  ["بورسعيد", "Port Said", 100],
  ["الإسماعيلية", "Ismailia", 100],
  ["السويس", "Suez", 110],
  ["دمياط", "Damietta", 110],
  ["سوهاج", "Sohag", 110],
  ["قنا", "Qena", 110],
  ["بني سويف", "Beni Suef", 110],
  ["المنيا", "Minya", 110],
  ["الأقصر", "Luxor", 115],
  ["أسوان", "Aswan", 115],
  ["البحر الأحمر / الغردقة", "Red Sea / Hurghada", 120],
];

module.exports = { categories, sizes, colors, shippingZones };
