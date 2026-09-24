// OPTIONAL: adds 4 sample products so a fresh store isn't empty while you test.
// Delete them from Admin > Products before going live.
//   npm run seed && npm run seed:demo
const fs = require("fs");
const path = require("path");
const prisma = require("../src/config/prisma");
const { UPLOADS_DIR } = require("../src/services/storage");

const ASSETS = path.join(__dirname, "seed-assets");

const publishAsset = (file) => {
  const target = path.join(UPLOADS_DIR, "seed");
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(path.join(ASSETS, file), path.join(target, file));
  return `/uploads/seed/${file}`;
};

const products = [
  {
    slug: "embroidered-silk-galabiya",
    name: "Embroidered Silk Galabiya",
    nameAr: "جلابية حرير مطرزة",
    description: "Soft embroidered silk galabiya, comfortable and elegant for home and special evenings.",
    descriptionAr: "جلابية حرير مطرزة ناعمة ومريحة، مناسبة للبيت والسهرات.",
    price: 850,
    oldPrice: 1050,
    stock: 25,
    isFeatured: true,
    category: "galabiyas",
    image: "product-galabiya.jpg",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Rose Pink", "Ivory White", "Black"],
  },
  {
    slug: "satin-pajama-set",
    name: "Satin Pajama Set",
    nameAr: "طقم بيجامة ساتان",
    description: "Two-piece satin pajama set with a smooth, cool feel.",
    descriptionAr: "طقم بيجامة ساتان من قطعتين بملمس ناعم ومريح.",
    price: 620,
    stock: 30,
    isFeatured: true,
    category: "pajamas",
    image: "product-pajama.jpg",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Blush Pink", "Beige"],
  },
  {
    slug: "lace-lingerie-set",
    name: "Lace Lingerie Set",
    nameAr: "طقم لانجيري دانتيل",
    description: "Delicate lace lingerie set.",
    descriptionAr: "طقم لانجيري دانتيل رقيق.",
    price: 540,
    stock: 20,
    isFeatured: true,
    category: "nightwear-lingerie",
    image: "product-lingerie.jpg",
    sizes: ["S", "M", "L"],
    colors: ["Rose Pink", "Black"],
  },
  {
    slug: "deluxe-makeup-palette",
    name: "Deluxe Makeup Palette",
    nameAr: "باليت ميكب ديلوكس",
    description: "Multi-shade makeup palette for everyday and evening looks.",
    descriptionAr: "باليت ميكب متعدد الدرجات للإطلالات اليومية والسهرات.",
    price: 390,
    stock: 40,
    isFeatured: true,
    category: "makeup",
    image: "product-makeup.jpg",
    sizes: [],
    colors: [],
  },
];

async function main() {
  for (const item of products) {
    if (await prisma.product.findUnique({ where: { slug: item.slug } })) continue;

    const category = await prisma.category.findUnique({ where: { slug: item.category } });
    if (!category) throw new Error(`Category "${item.category}" not found - run "npm run seed" first`);

    const sizeRows = await prisma.size.findMany({ where: { name: { in: item.sizes } } });
    const colorRows = await prisma.color.findMany({ where: { name: { in: item.colors } } });
    const url = publishAsset(item.image);

    await prisma.product.create({
      data: {
        slug: item.slug,
        name: item.name,
        nameAr: item.nameAr,
        description: item.description,
        descriptionAr: item.descriptionAr,
        price: item.price,
        oldPrice: item.oldPrice ?? null,
        stock: item.stock,
        isFeatured: item.isFeatured,
        categoryId: category.id,
        image: url,
        images: { create: [{ url, position: 0 }] },
        sizes: { create: sizeRows.map((size) => ({ sizeId: size.id })) },
        colors: { create: colorRows.map((color) => ({ colorId: color.id })) },
      },
    });
  }
  console.log("✅ Demo products ready");
}

main()
  .catch((error) => {
    console.error("❌ Demo seed error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
