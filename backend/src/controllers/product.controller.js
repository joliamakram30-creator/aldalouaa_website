const prisma = require("../config/prisma");
const { toId } = require("../utils/helpers");

// What the storefront needs to render a product card / page.
const productInclude = {
  category: true,

  images: {
    orderBy: {
      position: "asc",
    },
  },

  sizes: {
    include: {
      size: true,
    },
  },

  colors: {
    include: {
      color: true,
    },
  },

  scents: {
    include: {
      scent: true,
    },
  },

  // ======================================
  // PRODUCT VARIANTS / STOCK
  // ======================================
  // Each variant represents one Size + Color
  // combination and has its own stock.
  //
  // Example:
  // S + Black = 5
  // S + White = 2
  // M + Black = 8
  //
  // Scent does NOT affect stock.
  // ======================================

  variants: {
    include: {
      size: true,
      color: true,
    },

    orderBy: [
      {
        sizeId: "asc",
      },
      {
        colorId: "asc",
      },
    ],
  },
};

// ======================================
// GET ALL ACTIVE PRODUCTS (public)
// ======================================

const getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },

      include: productInclude,

      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Get Products Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

// ======================================
// GET SINGLE PRODUCT (public)
// ======================================

const getProductById = async (req, res) => {
  try {
    const id = toId(req.params.id);

    if (!id) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const product = await prisma.product.findUnique({
      where: {
        id,
      },

      include: productInclude,
    });

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Get Product Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
  productInclude,
};