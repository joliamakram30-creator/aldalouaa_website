// Base data the store needs to work: categories, sizes, colours, shipping zones.
// Safe to run many times - it never overwrites what you edited in the admin panel.
//   npm run seed
const fs = require("fs");
const path = require("path");
const prisma = require("../src/config/prisma");
const { UPLOADS_DIR } = require("../src/services/storage");
const { categories, sizes, colors, shippingZones } = require("./seed-data");
const extraColors = require("./extra-colors");

const ASSETS = path.join(__dirname, "seed-assets");

// copies prisma/seed-assets/<file> to uploads/seed/<file> and returns its public URL
const publishAsset = (file) => {
  const target = path.join(UPLOADS_DIR, "seed");
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(path.join(ASSETS, file), path.join(target, file));
  return `/uploads/seed/${file}`;
};

async function main() {
  for (const category of categories) {
    const existing = await prisma.category.findUnique({ where: { slug: category.slug } });

    if (!existing) {
      await prisma.category.create({
        data: {
          name: category.name,
          nameAr: category.nameAr,
          slug: category.slug,
          image: publishAsset(category.image),
        },
      });
    } else {
      const data = {};
      if (!existing.nameAr) data.nameAr = category.nameAr;
      if (!existing.image) data.image = publishAsset(category.image);
      if (Object.keys(data).length) await prisma.category.update({ where: { id: existing.id }, data });
    }
  }
  console.log("✅ Categories ready");

  for (const name of sizes) {
    await prisma.size.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log("✅ Sizes ready");

  // Colours: do this in bulk (one findMany + one createMany) instead of
  // one query per colour - avoids exhausting the DB connection pool.
  const allColors = [...colors, ...extraColors];

  const existingColors = await prisma.color.findMany({
    where: { name: { in: allColors.map((c) => c.name) } },
  });
  const existingMap = new Map(existingColors.map((c) => [c.name, c]));

  const toCreate = allColors.filter((c) => !existingMap.has(c.name));
  if (toCreate.length) {
    await prisma.color.createMany({ data: toCreate, skipDuplicates: true });
  }

  for (const color of allColors) {
    const existing = existingMap.get(color.name);
    if (existing) {
      const data = {};
      if (!existing.nameAr) data.nameAr = color.nameAr;
      if (!existing.hexCode) data.hexCode = color.hexCode;
      if (Object.keys(data).length) {
        await prisma.color.update({ where: { id: existing.id }, data });
      }
    }
  }

  console.log(`✅ Colours ready (${allColors.length} checked, ${toCreate.length} new)`);

  // Shipping zones are normally created by the migration. Only fill the table
  // if it is empty (e.g. after wiping it) - prices you changed are never touched.
  const zoneCount = await prisma.shippingZone.count();
  if (zoneCount === 0) {
    for (const [index, [nameAr, nameEn, price]] of shippingZones.entries()) {
      await prisma.shippingZone.create({ data: { nameAr, nameEn, price, sortOrder: index + 1 } });
    }
    console.log("✅ Shipping zones created");
  } else {
    console.log(`✅ Shipping zones already there (${zoneCount})`);
  }
}

main()
  .catch((error) => {
    console.error("❌ Seed error:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });