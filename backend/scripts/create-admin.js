// Creates an admin account, or promotes an existing account to admin.
//   npm run create-admin -- "Your Name" you@example.com "YourStrongPassword"
// (nothing is stored in the code - the password only exists in your terminal)
require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("../src/config/prisma");

async function main() {
  const [name, emailRaw, password] = process.argv.slice(2);

  if (!name || !emailRaw || !password) {
    console.log('Usage: npm run create-admin -- "Name" email@example.com "Password"');
    process.exitCode = 1;
    return;
  }

  const email = emailRaw.trim().toLowerCase();

  if (password.length < 8) {
    console.log("❌ Password must be at least 8 characters");
    process.exitCode = 1;
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: "ADMIN", password: hashed },
    });
    console.log(`✅ ${email} is now an ADMIN (password updated)`);
  } else {
    await prisma.user.create({ data: { name, email, password: hashed, role: "ADMIN" } });
    console.log(`✅ Admin created: ${email}`);
  }
}

main()
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
