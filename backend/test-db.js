require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

const dbUrl = new URL(process.env.DATABASE_URL);

console.log("Host:", dbUrl.hostname);
console.log("Port:", dbUrl.port);
console.log("Database:", dbUrl.pathname.replace(/^\//, ""));

const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: Number(dbUrl.port),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace(/^\//, ""),
  ssl: {
  rejectUnauthorized: false,
},
  connectionLimit: 2,
  connectTimeout: 10000,
  acquireTimeout: 15000,
});

const prisma = new PrismaClient({ adapter });

async function test() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 AS test`;
    console.log("DATABASE CONNECTED ✅", result);
  } catch (error) {
    console.error("DATABASE ERROR ❌");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

test();