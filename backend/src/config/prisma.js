require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Check your .env file.");
}

const dbUrl = new URL(process.env.DATABASE_URL);

const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: Number(dbUrl.port) || 3306,
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.replace(/^\//, ""),

  connectionLimit: Math.max(
    Number(process.env.DB_CONNECTION_LIMIT) || 10,
    2
  ),

  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT) || 10000,
  acquireTimeout: Number(process.env.DB_ACQUIRE_TIMEOUT) || 15000,
});

const prisma = new PrismaClient({
  adapter,
});

module.exports = prisma;