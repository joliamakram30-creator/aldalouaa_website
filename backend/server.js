const path = require("path");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");

// Load environment variables FIRST
dotenv.config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error(
    "❌ JWT_SECRET is missing or too short. Set a long random value in backend/.env"
  );
  process.exit(1);
}

const isProduction = process.env.NODE_ENV === "production";

const prisma = require("./src/config/prisma");
const { UPLOADS_DIR, isCloudinary } = require("./src/services/storage");

// ==============================
// Routes
// ==============================

const authRoutes = require("./src/routes/auth.routes");
const productRoutes = require("./src/routes/product.routes");
const categoryRoutes = require("./src/routes/category.routes");
const cartRoutes = require("./src/routes/cart.routes");
const orderRoutes = require("./src/routes/order.routes");
const favoriteRoutes = require("./src/routes/favorite.routes");
const optionRoutes = require("./src/routes/option.routes");
const adminOrderRoutes = require("./src/routes/admin.order.routes");
const adminDashboardRoutes = require("./src/routes/admin.dashboard.routes");
const adminProductRoutes = require("./src/routes/admin.product.routes");
const adminUserRoutes = require("./src/routes/admin.user.routes");
const {
  storeRouter,
  adminRouter: adminShippingRoutes,
} = require("./src/routes/shipping.routes");
const notificationRoutes = require("./src/routes/notification.routes");

// ==============================
// App
// ==============================

const app = express();

const PORT = process.env.PORT || 5000;

// Behind nginx / a hosting proxy the real client IP comes from the proxy
// (needed for the login rate limit). Set TRUST_PROXY=1 in production if so.
if (process.env.TRUST_PROXY) {
  app.set(
    "trust proxy",
    Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY
  );
}

// ==============================
// Security
// ==============================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

// ==============================
// CORS
// ==============================

// FRONTEND_URL supports a comma-separated list.
// Example:
// https://al-dalouaa.com,https://www.al-dalouaa.com

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

if (isProduction && allowedOrigins.length === 0) {
  console.warn(
    "⚠️ FRONTEND_URL is not set - the API accepts requests from any website. Set it in production."
  );
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// ==============================
// Body parsing
// ==============================

app.use(express.json({ limit: "1mb" }));

// ==============================
// Uploaded images
// ==============================

// Uploaded images (product photos, category pictures, payment proofs).
app.use(
  "/uploads",
  express.static(UPLOADS_DIR, {
    maxAge: "7d",
    index: false,
    dotfiles: "ignore",
  })
);

// ==============================
// Root + health
// ==============================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AL-DALOUAA API is running 🚀",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      message: "API and Database are connected successfully ✅",
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed ❌",
    });
  }
});

// ==============================
// Public + customer routes
// ==============================

app.use("/api/auth", authRoutes);

app.use("/api/store", storeRouter);

app.use("/api/products", productRoutes);

app.use("/api/categories", categoryRoutes);

app.use("/api/cart", cartRoutes);

app.use("/api/orders", orderRoutes);

app.use("/api/favorites", favoriteRoutes);

// ==============================
// Admin routes
// ==============================

app.use("/api/admin/dashboard", adminDashboardRoutes);

app.use("/api/admin/products", adminProductRoutes);

app.use("/api/admin/orders", adminOrderRoutes);

app.use("/api/admin/users", adminUserRoutes);

app.use("/api/admin/options", optionRoutes);

app.use("/api/admin/shipping", adminShippingRoutes);

app.use("/api/admin/notifications", notificationRoutes);

// ==============================
// 404
// ==============================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ==============================
// Global error handler
// ==============================

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Each image must be 5 MB or smaller"
        : err.code === "LIMIT_FILE_COUNT" ||
          err.code === "LIMIT_UNEXPECTED_FILE"
        ? "Too many images (maximum 10)"
        : err.message;

    return res.status(400).json({
      success: false,
      message,
    });
  }

  if (err?.message === "Only image files are allowed") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err?.type === "entity.parse.failed" || err instanceof SyntaxError) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON in request body",
    });
  }

  if (err?.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "This origin is not allowed to access the API",
    });
  }

  console.error("Unhandled Error:", err);

  const status = err.status || 500;

  res.status(status).json({
    success: false,
    message:
      status < 500 || !isProduction
        ? err.message || "Internal server error"
        : "Internal server error",
  });
});

// ==============================
// Start local server
// ==============================

// On Vercel, we export the Express app instead of calling app.listen().
// Locally, we still run the normal Express server.

let server = null;

if (!process.env.VERCEL) {
  server = app.listen(PORT, () => {
    console.log(
      `🚀 AL-DALOUAA API running on http://localhost:${PORT}`
    );

    console.log(
      isCloudinary
        ? "🖼️ Images: Cloudinary"
        : "🖼️ Images: stored on this server in backend/uploads (set CLOUDINARY_* in .env to use Cloudinary)"
    );
  });
}

// ==============================
// Graceful shutdown
// ==============================

const shutdown = async () => {
  try {
    if (server) {
      server.close();
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error("Shutdown error:", error);
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ==============================
// Vercel export
// ==============================

module.exports = app;