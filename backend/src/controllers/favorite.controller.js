const prisma = require("../config/prisma");
const { toId } = require("../utils/helpers");

const favoriteProductInclude = {
  category: true,
  images: { orderBy: { position: "asc" } },
  sizes: { include: { size: true } },
  colors: { include: { color: true } },
};

const listFavorites = (userId) =>
  prisma.wishlist.findMany({
    where: { userId, product: { isActive: true } },
    include: { product: { include: favoriteProductInclude } },
    orderBy: { createdAt: "desc" },
  });

// ======================================
// GET MY FAVORITES
// ======================================

const getFavorites = async (req, res) => {
  try {
    const favorites = await listFavorites(req.user.userId);
    res.json({ success: true, favorites, totalItems: favorites.length });
  } catch (error) {
    console.error("Get Favorites Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch favorites" });
  }
};

// ======================================
// ADD TO FAVORITES (idempotent)
// ======================================

const addToFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const productId = toId(req.body.productId);

    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (!product.isActive) {
      return res.status(400).json({ success: false, message: "Product is not available" });
    }

    await prisma.wishlist.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    });

    res.status(201).json({
      success: true,
      message: "Product added to favorites successfully",
    });
  } catch (error) {
    console.error("Add Favorite Error:", error);
    res.status(500).json({ success: false, message: "Failed to add product to favorites" });
  }
};

// ======================================
// MERGE GUEST FAVORITES AFTER LOGIN  { productIds: [] }
// ======================================

const mergeFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const ids = Array.isArray(req.body.productIds)
      ? [...new Set(req.body.productIds.map(toId).filter(Boolean))].slice(0, 200)
      : [];

    if (ids.length) {
      const products = await prisma.product.findMany({
        where: { id: { in: ids }, isActive: true },
        select: { id: true },
      });

      for (const product of products) {
        await prisma.wishlist.upsert({
          where: { userId_productId: { userId, productId: product.id } },
          update: {},
          create: { userId, productId: product.id },
        });
      }
    }

    const favorites = await listFavorites(userId);
    res.json({ success: true, favorites, totalItems: favorites.length });
  } catch (error) {
    console.error("Merge Favorites Error:", error);
    res.status(500).json({ success: false, message: "Failed to merge favorites" });
  }
};

// ======================================
// REMOVE FROM FAVORITES
// ======================================

const removeFromFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const productId = toId(req.params.productId);

    if (!productId) {
      return res.status(400).json({ success: false, message: "Invalid product" });
    }

    await prisma.wishlist.deleteMany({ where: { userId, productId } });

    res.json({ success: true, message: "Product removed from favorites successfully" });
  } catch (error) {
    console.error("Remove Favorite Error:", error);
    res.status(500).json({ success: false, message: "Failed to remove product from favorites" });
  }
};

// ======================================
// CLEAR FAVORITES
// ======================================

const clearFavorites = async (req, res) => {
  try {
    await prisma.wishlist.deleteMany({ where: { userId: req.user.userId } });
    res.json({ success: true, message: "Favorites cleared successfully" });
  } catch (error) {
    console.error("Clear Favorites Error:", error);
    res.status(500).json({ success: false, message: "Failed to clear favorites" });
  }
};

module.exports = {
  getFavorites,
  addToFavorites,
  mergeFavorites,
  removeFromFavorites,
  clearFavorites,
};
