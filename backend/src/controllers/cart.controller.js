const prisma = require("../config/prisma");
const { cleanText, toId } = require("../utils/helpers");

const MAX_QUANTITY_PER_LINE = 20;

const productForCart = {
  category: true,
  images: { orderBy: { position: "asc" }, take: 1 },
  sizes: { include: { size: true } },
  colors: { include: { color: true } },
  scents: { include: { scent: true } },
};

const cartInclude = {
  items: {
    orderBy: { id: "asc" },
    include: { product: { include: productForCart } },
  },
};

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const sendError = (res, error, fallback) => {
  if (error.status) {
    return res.status(error.status).json({ success: false, message: error.message });
  }
  console.error(fallback, error);
  return res.status(500).json({ success: false, message: fallback });
};

const getOrCreateCart = async (userId) => {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;

  try {
    return await prisma.cart.create({ data: { userId } });
  } catch (error) {
    // two requests created it at the same moment
    if (error.code === "P2002") return prisma.cart.findUnique({ where: { userId } });
    throw error;
  }
};

const buildCartResponse = (cart) => {
  const items = cart.items.map((item) => ({
    ...item,
    available: item.product.isActive && item.product.stock > 0,
    maxQuantity: Math.min(item.product.stock, MAX_QUANTITY_PER_LINE),
  }));

  const subtotalCents = items.reduce(
    (total, item) => total + Math.round(Number(item.product.price) * 100) * item.quantity,
    0
  );

  return {
    ...cart,
    items,
    subtotal: subtotalCents / 100,
    totalItems: items.reduce((total, item) => total + item.quantity, 0),
  };
};

const loadCartResponse = async (userId) => {
  const cart = await getOrCreateCart(userId);
  const full = await prisma.cart.findUnique({ where: { id: cart.id }, include: cartInclude });
  return buildCartResponse(full);
};

// A product that has sizes/colors must be added with a valid size/colour.
const resolveVariant = (product, rawSize, rawColor, rawScent) => {
  const size = cleanText(rawSize, 64);
  const color = cleanText(rawColor, 64);
  const scent = cleanText(rawScent, 64);

  const sizeNames = product.sizes.map((item) => item.size.name);
  const colorNames = product.colors.map((item) => item.color.name);
  const scentNames = product.scents.map((item) => item.scent.name);

  if (sizeNames.length > 0) {
    if (!size) throw httpError(400, "Please select a size");
    if (!sizeNames.includes(size)) throw httpError(400, "The selected size is not available");
  }

  if (colorNames.length > 0) {
    if (!color) throw httpError(400, "Please select a color");
    if (!colorNames.includes(color)) throw httpError(400, "The selected color is not available");
  }
  if (scentNames.length > 0) {
    if (!scent) throw httpError(400, "Please select a scent");
    if (!scentNames.includes(scent)) throw httpError(400, "The selected scent is not available");
  }

  return {
    size: sizeNames.length > 0 ? size : "",
    color: colorNames.length > 0 ? color : "",
    scent: scentNames.length > 0 ? scent : "",
  };
};

// Adds `quantity` of a product variant to the cart.
// capToStock=false -> throws when there isn't enough stock (normal add)
// capToStock=true  -> silently caps at the available stock (guest cart merge)
const addLine = async (cartId, product, quantity, rawSize, rawColor, rawScent, capToStock) => {
  if (!product.isActive) throw httpError(400, "Product is not available");
  if (product.stock < 1) throw httpError(400, "This product is out of stock");

  const { size, color, scent } = resolveVariant(product, rawSize, rawColor, rawScent);

  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId_size_color_scent: { cartId, productId: product.id, size, color, scent } },
  });

  const limit = Math.min(product.stock, MAX_QUANTITY_PER_LINE);
  let newQuantity = (existing ? existing.quantity : 0) + quantity;

  if (newQuantity > limit) {
    if (!capToStock) {
      throw httpError(400, `Only ${limit} available in stock for this product`);
    }
    newQuantity = limit;
  }

  if (existing) {
    return prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: newQuantity } });
  }

  return prisma.cartItem.create({
    data: { cartId, productId: product.id, quantity: newQuantity, size, color, scent },
  });
};

const loadProduct = (productId) =>
  prisma.product.findUnique({
    where: { id: productId },
    include: { sizes: { include: { size: true } }, colors: { include: { color: true } }, scents: { include: { scent: true } } },
  });

// ======================================
// GET MY CART
// ======================================

const getCart = async (req, res) => {
  try {
    const cart = await loadCartResponse(req.user.userId);
    res.json({ success: true, cart });
  } catch (error) {
    sendError(res, error, "Failed to fetch cart");
  }
};

// ======================================
// ADD TO CART  { productId, quantity, size, color }
// ======================================

const addToCart = async (req, res) => {
  try {
    const productId = toId(req.body.productId);
    const quantity = Math.floor(Number(req.body.quantity) || 1);

    if (!productId) throw httpError(400, "Product ID is required");
    if (quantity < 1) throw httpError(400, "Quantity must be at least 1");

    const product = await loadProduct(productId);
    if (!product) throw httpError(404, "Product not found");

    const cart = await getOrCreateCart(req.user.userId);
    await addLine(cart.id, product, quantity, req.body.size, req.body.color, req.body.scent, false);

    res.status(201).json({
      success: true,
      message: "Product added to cart successfully",
      cart: await loadCartResponse(req.user.userId),
    });
  } catch (error) {
    sendError(res, error, "Failed to add product to cart");
  }
};

// ======================================
// MERGE GUEST CART AFTER LOGIN
//   { items: [{ productId, quantity, size, color }] }
// ======================================

const mergeCart = async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 50) : [];
    const cart = await getOrCreateCart(req.user.userId);

    let merged = 0;
    let skipped = 0;

    for (const item of items) {
      try {
        const productId = toId(item.productId);
        const quantity = Math.floor(Number(item.quantity) || 1);
        if (!productId || quantity < 1) {
          skipped += 1;
          continue;
        }

        const product = await loadProduct(productId);
        if (!product) {
          skipped += 1;
          continue;
        }

        await addLine(cart.id, product, quantity, item.size, item.color, item.scent, true);
        merged += 1;
      } catch {
        skipped += 1;
      }
    }

    res.json({
      success: true,
      merged,
      skipped,
      cart: await loadCartResponse(req.user.userId),
    });
  } catch (error) {
    sendError(res, error, "Failed to merge cart");
  }
};

// ======================================
// UPDATE QUANTITY  PUT /api/cart/items/:itemId  { quantity }
// ======================================

const updateCartItem = async (req, res) => {
  try {
    const itemId = toId(req.params.itemId);
    const quantity = Math.floor(Number(req.body.quantity));

    if (!itemId) throw httpError(400, "Invalid cart item");
    if (!quantity || quantity < 1) throw httpError(400, "Quantity must be at least 1");

    const cart = await getOrCreateCart(req.user.userId);

    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: true },
    });

    if (!item) throw httpError(404, "Item is not in your cart");

    const limit = Math.min(item.product.stock, MAX_QUANTITY_PER_LINE);
    if (quantity > limit) {
      throw httpError(400, `Only ${limit} available in stock for this product`);
    }

    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });

    res.json({
      success: true,
      message: "Cart item updated successfully",
      cart: await loadCartResponse(req.user.userId),
    });
  } catch (error) {
    sendError(res, error, "Failed to update cart item");
  }
};

// ======================================
// REMOVE ITEM  DELETE /api/cart/items/:itemId
// ======================================

const removeFromCart = async (req, res) => {
  try {
    const itemId = toId(req.params.itemId);
    if (!itemId) throw httpError(400, "Invalid cart item");

    const cart = await getOrCreateCart(req.user.userId);

    const result = await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
    if (result.count === 0) throw httpError(404, "Item is not in your cart");

    res.json({
      success: true,
      message: "Product removed from cart successfully",
      cart: await loadCartResponse(req.user.userId),
    });
  } catch (error) {
    sendError(res, error, "Failed to remove product from cart");
  }
};

// ======================================
// CLEAR CART
// ======================================

const clearCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.userId);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    res.json({
      success: true,
      message: "Cart cleared successfully",
      cart: await loadCartResponse(req.user.userId),
    });
  } catch (error) {
    sendError(res, error, "Failed to clear cart");
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
