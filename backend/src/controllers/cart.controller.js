
const prisma = require("../config/prisma");
const { cleanText, toId } = require("../utils/helpers");

const MAX_QUANTITY_PER_LINE = 20;

const productForCart = {
  category: true,

  images: {
    orderBy: { position: "asc" },
    take: 1,
  },

  sizes: {
    include: { size: true },
  },

  colors: {
    include: { color: true },
  },

  /*
    Scent stock is stored directly on ProductScent.

    ProductScent:
      productId
      scentId
      stock

    Scent stock is INDEPENDENT from Size + Color stock.
  */
  scents: {
    include: { scent: true },
  },

  /*
    Size + Color stock only.

    IMPORTANT:
    Do NOT add scentId here.
  */
  variants: {
    include: {
      size: true,
      color: true,
    },
  },
};

const cartInclude = {
  items: {
    orderBy: { id: "asc" },

    include: {
      product: {
        include: productForCart,
      },
    },
  },
};

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const sendError = (res, error, fallback) => {
  if (error.status) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
    });
  }

  console.error(fallback, error);

  return res.status(500).json({
    success: false,
    message: fallback,
  });
};

const getOrCreateCart = async (userId) => {
  const existing = await prisma.cart.findUnique({
    where: { userId },
  });

  if (existing) return existing;

  try {
    return await prisma.cart.create({
      data: { userId },
    });
  } catch (error) {
    // Two requests created it at the same moment.
    if (error.code === "P2002") {
      return prisma.cart.findUnique({
        where: { userId },
      });
    }

    throw error;
  }
};

/*
  ============================================================
  SIZE + COLOR STOCK HELPERS
  ============================================================
*/

/*
  Returns true when the product has ProductVariant rows.

  ProductVariant represents ONLY:

      Size + Color

  Scent is NOT part of ProductVariant.
*/
const hasVariantStock = (product) => {
  return (
    Array.isArray(product.variants) &&
    product.variants.length > 0
  );
};

/*
  Find the exact Size + Color variant.

  Examples:

    M + Black
    M + White
    L + Black

  Each combination has its own stock.
*/
const findProductVariant = (
  product,
  size,
  color
) => {
  if (!hasVariantStock(product)) {
    return null;
  }

  return (
    product.variants.find((variant) => {
      const variantSize =
        variant.size?.name || "";

      const variantColor =
        variant.color?.name || "";

      return (
        variantSize === size &&
        variantColor === color
      );
    }) || null
  );
};

/*
  Get stock for the exact Size + Color.

  If the product has ProductVariant rows:
      ProductVariant.stock is the source of truth.

  If the product has no variants yet:
      Product.stock remains the backward-compatible source.
*/
const getVariantStock = (
  product,
  size,
  color
) => {
  if (!hasVariantStock(product)) {
    return Math.max(
      0,
      Number(product.stock || 0)
    );
  }

  const variant = findProductVariant(
    product,
    size,
    color
  );

  if (!variant) {
    return 0;
  }

  return Math.max(
    0,
    Number(variant.stock || 0)
  );
};

/*
  ============================================================
  SCENT STOCK HELPERS
  ============================================================
*/

/*
  Find the exact ProductScent row by scent name.

  IMPORTANT:

  Scent stock is completely independent from
  Size + Color stock.

  Example:

      M + Black = 8
      Vanilla  = 10

  They are two separate stock values.
*/
const findProductScent = (
  product,
  scent
) => {
  if (
    !Array.isArray(product.scents) ||
    !scent
  ) {
    return null;
  }

  return (
    product.scents.find((productScent) => {
      const scentName =
        productScent.scent?.name || "";

      return scentName === scent;
    }) || null
  );
};

/*
  Get stock for the selected scent.

  If there is no selected scent:
      return null

  If the scent does not exist:
      return 0

  Otherwise:
      ProductScent.stock
*/
const getScentStock = (
  product,
  scent
) => {
  if (!scent) {
    return null;
  }

  const productScent =
    findProductScent(
      product,
      scent
    );

  if (!productScent) {
    return 0;
  }

  return Math.max(
    0,
    Number(productScent.stock || 0)
  );
};

/*
  ============================================================
  COMBINED STOCK
  ============================================================
*/

/*
  Calculate the maximum quantity the customer can currently
  purchase for the exact selected options.

  Size + Color:
      variantStock

  Scent:
      scentStock

  If both exist:

      min(variantStock, scentStock)

  Example:

      M + Black = 8
      Vanilla   = 3

      Customer can buy maximum 3.

  Scent NEVER becomes part of ProductVariant.
*/
const getAvailableQuantity = (
  product,
  size,
  color,
  scent
) => {
  const variantStock =
    getVariantStock(
      product,
      size,
      color
    );

  const scentStock =
    getScentStock(
      product,
      scent
    );

  /*
    Product has a selected scent.
    Both stocks must be available.
  */
  if (scent) {
    return Math.min(
      variantStock,
      scentStock ?? 0
    );
  }

  /*
    No selected scent.
    Only Size + Color stock matters.
  */
  return variantStock;
};

/*
  ============================================================
  CART RESPONSE
  ============================================================
*/

const buildCartResponse = (cart) => {
  const items = cart.items.map(
    (item) => {
      const size =
        item.size || "";

      const color =
        item.color || "";

      const scent =
        item.scent || "";

      /*
        Size + Color stock.
      */
      const variantStock =
        getVariantStock(
          item.product,
          size,
          color
        );

      /*
        Independent scent stock.
      */
      const scentStock =
        getScentStock(
          item.product,
          scent
        );

      /*
        Both stock systems must be available.

        If there is no scent:
          only variant stock matters.

        If there is a scent:
          variant stock AND scent stock
          must be greater than zero.
      */
      const availableQuantity =
        getAvailableQuantity(
          item.product,
          size,
          color,
          scent
        );

      const available =
        item.product.isActive &&
        availableQuantity > 0;

      return {
        ...item,

        /*
          Customer-facing availability only.

          We intentionally do NOT expose:

            variantStock
            scentStock

          as numeric stock values.
        */
        available,

        /*
          This is the maximum quantity allowed for
          the current cart line.

          It is based on BOTH independent stock systems
          when a scent is selected.
        */
        maxQuantity: Math.min(
          Math.max(
            0,
            availableQuantity
          ),
          MAX_QUANTITY_PER_LINE
        ),
      };
    }
  );

  const subtotalCents =
    items.reduce(
      (total, item) =>
        total +
        Math.round(
          Number(
            item.product.price
          ) * 100
        ) *
          item.quantity,
      0
    );

  return {
    ...cart,

    items,

    subtotal:
      subtotalCents / 100,

    totalItems:
      items.reduce(
        (total, item) =>
          total + item.quantity,
        0
      ),
  };
};

const loadCartResponse =
  async (userId) => {
    const cart =
      await getOrCreateCart(
        userId
      );

    const full =
      await prisma.cart.findUnique({
        where: {
          id: cart.id,
        },

        include:
          cartInclude,
      });

    return buildCartResponse(
      full
    );
  };

/*
  ============================================================
  RESOLVE SELECTED OPTIONS
  ============================================================
*/

const resolveVariant = (
  product,
  rawSize,
  rawColor,
  rawScent
) => {
  const size = cleanText(
    rawSize,
    64
  );

  const color = cleanText(
    rawColor,
    64
  );

  const scent = cleanText(
    rawScent,
    64
  );

  const sizeNames =
    product.sizes.map(
      (item) =>
        item.size.name
    );

  const colorNames =
    product.colors.map(
      (item) =>
        item.color.name
    );

  const scentNames =
    product.scents.map(
      (item) =>
        item.scent.name
    );

  /*
    ==========================================================
    SIZE
    ==========================================================
  */

  if (sizeNames.length > 0) {
    if (!size) {
      throw httpError(
        400,
        "Please select a size"
      );
    }

    if (!sizeNames.includes(size)) {
      throw httpError(
        400,
        "The selected size is not available"
      );
    }
  }

  /*
    ==========================================================
    COLOR
    ==========================================================
  */

  if (colorNames.length > 0) {
    if (!color) {
      throw httpError(
        400,
        "Please select a color"
      );
    }

    if (!colorNames.includes(color)) {
      throw httpError(
        400,
        "The selected color is not available"
      );
    }
  }

  /*
    ==========================================================
    SCENT
    ==========================================================

    Scent is required when the product has scents.

    IMPORTANT:
    This only validates that the scent exists.

    Its stock is checked separately below.
  */

  if (scentNames.length > 0) {
    if (!scent) {
      throw httpError(
        400,
        "Please select a scent"
      );
    }

    if (!scentNames.includes(scent)) {
      throw httpError(
        400,
        "The selected scent is not available"
      );
    }
  }

  return {
    size:
      sizeNames.length > 0
        ? size
        : "",

    color:
      colorNames.length > 0
        ? color
        : "",

    scent:
      scentNames.length > 0
        ? scent
        : "",
  };
};

/*
  ============================================================
  VALIDATE COMBINED STOCK
  ============================================================
*/

const validateSelectedStock = (
  product,
  size,
  color,
  scent
) => {
  /*
    Size + Color stock.
  */
  const variantStock =
    getVariantStock(
      product,
      size,
      color
    );

  if (variantStock < 1) {
    throw httpError(
      400,
      "This size/color combination is sold out"
    );
  }

  /*
    Scent stock.

    This is completely independent from
    Size + Color stock.
  */
  if (scent) {
    const scentStock =
      getScentStock(
        product,
        scent
      );

    if (
      scentStock === null ||
      scentStock < 1
    ) {
      throw httpError(
        400,
        "This scent is sold out"
      );
    }
  }

  /*
    Combined availability.

    Both must have stock.
  */
  const availableQuantity =
    getAvailableQuantity(
      product,
      size,
      color,
      scent
    );

  if (availableQuantity < 1) {
    throw httpError(
      400,
      "The selected options are sold out"
    );
  }

  return availableQuantity;
};

/*
  ============================================================
  ADD LINE
  ============================================================
*/

const addLine = async (
  cartId,
  product,
  quantity,
  rawSize,
  rawColor,
  rawScent,
  capToStock
) => {
  if (!product.isActive) {
    throw httpError(
      400,
      "Product is not available"
    );
  }

  const {
    size,
    color,
    scent,
  } = resolveVariant(
    product,
    rawSize,
    rawColor,
    rawScent
  );

  /*
    Validate BOTH independent stock systems.
  */
  const availableQuantity =
    validateSelectedStock(
      product,
      size,
      color,
      scent
    );

  const existing =
    await prisma.cartItem.findUnique({
      where: {
        cartId_productId_size_color_scent: {
          cartId,
          productId: product.id,
          size,
          color,
          scent,
        },
      },
    });

  /*
    Maximum quantity is determined by:

      Size + Color stock
      AND
      Scent stock

    when scent is selected.
  */
  const limit = Math.min(
    availableQuantity,
    MAX_QUANTITY_PER_LINE
  );

  let newQuantity =
    (existing
      ? existing.quantity
      : 0) + quantity;

  if (newQuantity > limit) {
    if (!capToStock) {
      throw httpError(
        400,
        "The selected options do not have enough stock"
      );
    }

    newQuantity = limit;
  }

  if (newQuantity < 1) {
    throw httpError(
      400,
      "The selected options are sold out"
    );
  }

  if (existing) {
    return prisma.cartItem.update({
      where: {
        id: existing.id,
      },

      data: {
        quantity:
          newQuantity,
      },
    });
  }

  return prisma.cartItem.create({
    data: {
      cartId,
      productId:
        product.id,
      quantity:
        newQuantity,
      size,
      color,
      scent,
    },
  });
};

/*
  ============================================================
  LOAD PRODUCT
  ============================================================
*/

const loadProduct = (
  productId
) =>
  prisma.product.findUnique({
    where: {
      id: productId,
    },

    include: {
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

      /*
        ProductScent includes:

          productId
          scentId
          stock

        No ProductVariant relationship here.
      */
      scents: {
        include: {
          scent: true,
        },
      },

      /*
        ProductVariant contains ONLY:
          Size + Color + stock
      */
      variants: {
        include: {
          size: true,
          color: true,
        },
      },
    },
  });

/*
  ============================================================
  GET MY CART
  ============================================================
*/

const getCart = async (
  req,
  res
) => {
  try {
    const cart =
      await loadCartResponse(
        req.user.userId
      );

    res.json({
      success: true,
      cart,
    });
  } catch (error) {
    sendError(
      res,
      error,
      "Failed to fetch cart"
    );
  }
};

/*
  ============================================================
  ADD TO CART
  ============================================================
*/

const addToCart = async (
  req,
  res
) => {
  try {
    const productId =
      toId(
        req.body.productId
      );

    const quantity =
      Math.floor(
        Number(
          req.body.quantity
        ) || 1
      );

    if (!productId) {
      throw httpError(
        400,
        "Product ID is required"
      );
    }

    if (quantity < 1) {
      throw httpError(
        400,
        "Quantity must be at least 1"
      );
    }

    const product =
      await loadProduct(
        productId
      );

    if (!product) {
      throw httpError(
        404,
        "Product not found"
      );
    }

    const cart =
      await getOrCreateCart(
        req.user.userId
      );

    await addLine(
      cart.id,
      product,
      quantity,
      req.body.size,
      req.body.color,
      req.body.scent,
      false
    );

    res.status(201).json({
      success: true,

      message:
        "Product added to cart successfully",

      cart:
        await loadCartResponse(
          req.user.userId
        ),
    });
  } catch (error) {
    sendError(
      res,
      error,
      "Failed to add product to cart"
    );
  }
};

/*
  ============================================================
  MERGE GUEST CART AFTER LOGIN
  ============================================================
*/

const mergeCart = async (
  req,
  res
) => {
  try {
    const items =
      Array.isArray(
        req.body.items
      )
        ? req.body.items.slice(
            0,
            50
          )
        : [];

    const cart =
      await getOrCreateCart(
        req.user.userId
      );

    let merged = 0;
    let skipped = 0;

    for (const item of items) {
      try {
        const productId =
          toId(
            item.productId
          );

        const quantity =
          Math.floor(
            Number(
              item.quantity
            ) || 1
          );

        if (
          !productId ||
          quantity < 1
        ) {
          skipped += 1;
          continue;
        }

        const product =
          await loadProduct(
            productId
          );

        if (!product) {
          skipped += 1;
          continue;
        }

        /*
          capToStock = true

          This allows guest cart merging to reduce the
          quantity to the currently available combined stock.
        */
        await addLine(
          cart.id,
          product,
          quantity,
          item.size,
          item.color,
          item.scent,
          true
        );

        merged += 1;
      } catch {
        skipped += 1;
      }
    }

    res.json({
      success: true,
      merged,
      skipped,

      cart:
        await loadCartResponse(
          req.user.userId
        ),
    });
  } catch (error) {
    sendError(
      res,
      error,
      "Failed to merge cart"
    );
  }
};

/*
  ============================================================
  UPDATE QUANTITY
  PUT /api/cart/items/:itemId
  ============================================================
*/

const updateCartItem = async (
  req,
  res
) => {
  try {
    const itemId =
      toId(
        req.params.itemId
      );

    const quantity =
      Math.floor(
        Number(
          req.body.quantity
        )
      );

    if (!itemId) {
      throw httpError(
        400,
        "Invalid cart item"
      );
    }

    if (
      !quantity ||
      quantity < 1
    ) {
      throw httpError(
        400,
        "Quantity must be at least 1"
      );
    }

    const cart =
      await getOrCreateCart(
        req.user.userId
      );

    const item =
      await prisma.cartItem.findFirst({
        where: {
          id: itemId,
          cartId: cart.id,
        },

        include: {
          product: {
            include: {
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

              variants: {
                include: {
                  size: true,
                  color: true,
                },
              },
            },
          },
        },
      });

    if (!item) {
      throw httpError(
        404,
        "Item is not in your cart"
      );
    }

    /*
      Re-check the current stock of BOTH:

        Size + Color
        Scent
    */
    const availableQuantity =
      validateSelectedStock(
        item.product,
        item.size || "",
        item.color || "",
        item.scent || ""
      );

    const limit = Math.min(
      availableQuantity,
      MAX_QUANTITY_PER_LINE
    );

    if (quantity > limit) {
      throw httpError(
        400,
        "The selected options do not have enough stock"
      );
    }

    await prisma.cartItem.update({
      where: {
        id: item.id,
      },

      data: {
        quantity,
      },
    });

    res.json({
      success: true,

      message:
        "Cart item updated successfully",

      cart:
        await loadCartResponse(
          req.user.userId
        ),
    });
  } catch (error) {
    sendError(
      res,
      error,
      "Failed to update cart item"
    );
  }
};

/*
  ============================================================
  REMOVE ITEM
  ============================================================
*/

const removeFromCart = async (
  req,
  res
) => {
  try {
    const itemId =
      toId(
        req.params.itemId
      );

    if (!itemId) {
      throw httpError(
        400,
        "Invalid cart item"
      );
    }

    const cart =
      await getOrCreateCart(
        req.user.userId
      );

    const result =
      await prisma.cartItem.deleteMany({
        where: {
          id: itemId,
          cartId: cart.id,
        },
      });

    if (result.count === 0) {
      throw httpError(
        404,
        "Item is not in your cart"
      );
    }

    res.json({
      success: true,

      message:
        "Product removed from cart successfully",

      cart:
        await loadCartResponse(
          req.user.userId
        ),
    });
  } catch (error) {
    sendError(
      res,
      error,
      "Failed to remove product from cart"
    );
  }
};

/*
  ============================================================
  CLEAR CART
  ============================================================
*/

const clearCart = async (
  req,
  res
) => {
  try {
    const cart =
      await getOrCreateCart(
        req.user.userId
      );

    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });

    res.json({
      success: true,

      message:
        "Cart cleared successfully",

      cart:
        await loadCartResponse(
          req.user.userId
        ),
    });
  } catch (error) {
    sendError(
      res,
      error,
      "Failed to clear cart"
    );
  }
};

module.exports = {
  getCart,
  addToCart,
  mergeCart,
  updateCartItem,
  removeFromCart,
  clearCart,
};

