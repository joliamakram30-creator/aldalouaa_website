
const prisma = require("../config/prisma");
const { uploadImage, deleteImage } = require("../services/storage");
const {
  slugify,
  parseBoolean,
  parseArray,
  parseIdList,
  cleanText,
  toId,
} = require("../utils/helpers");

const MAX_IMAGES = 10;

const adminInclude = {
  category: true,
  images: { orderBy: { position: "asc" } },
  sizes: { include: { size: true } },
  colors: { include: { color: true } },
  scents: { include: { scent: true } },
};

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

// imageOrder (optional JSON array) fixes the final order of the pictures, e.g.
// [12, "new:0", 15, "new:1"] = existing image 12, first uploaded file,
// existing 15, second file.
// The first entry becomes the cover. Entries it doesn't mention keep
// their relative order at the end.
const orderImages = (entries, rawOrder) => {
  if (rawOrder === undefined) return entries;

  const lookup = new Map(entries.map((entry) => [entry.key, entry]));
  const ordered = [];
  const seen = new Set();

  for (const key of parseArray(rawOrder).map(String)) {
    const entry = lookup.get(key);
    if (entry && !seen.has(entry)) {
      ordered.push(entry);
      seen.add(entry);
    }
  }

  return [...ordered, ...entries.filter((entry) => !seen.has(entry))];
};

// Reads + validates the fields shared by create and update.
// Returns { data } or throws an error with a status.
const readProductFields = (body, { partial }) => {
  const data = {};
  const has = (key) => body[key] !== undefined;

  if (!partial || has("name") || has("nameAr")) {
    const name = cleanText(body.name, 191);
    const nameAr = cleanText(body.nameAr, 191);

    // Either language is enough - the other one falls back to it.
    if (!name && !nameAr) {
      throw httpError(400, "Product name is required");
    }

    data.name = name || nameAr;
    data.nameAr = nameAr || null;
  }

  if (!partial || has("description")) {
    data.description = cleanText(body.description, 10000) || null;
  }

  if (!partial || has("descriptionAr")) {
    data.descriptionAr = cleanText(body.descriptionAr, 10000) || null;
  }

  if (!partial || has("price")) {
    const price = Number(body.price);

    if (
      body.price === undefined ||
      body.price === "" ||
      Number.isNaN(price) ||
      price <= 0
    ) {
      throw httpError(400, "Price must be a number greater than 0");
    }

    if (price > 10000000) {
      throw httpError(400, "Price is too large");
    }

    data.price = Math.round(price * 100) / 100;
  }

  if (!partial || has("oldPrice")) {
    if (
      body.oldPrice === undefined ||
      body.oldPrice === null ||
      body.oldPrice === ""
    ) {
      data.oldPrice = null;
    } else {
      const oldPrice = Number(body.oldPrice);

      if (Number.isNaN(oldPrice) || oldPrice <= 0) {
        throw httpError(400, "Old price must be a number greater than 0");
      }

      data.oldPrice = Math.round(oldPrice * 100) / 100;
    }
  }

  if (!partial || has("stock")) {
    const stock = Number(
      body.stock === undefined || body.stock === "" ? 0 : body.stock
    );

    if (!Number.isInteger(stock) || stock < 0) {
      throw httpError(400, "Stock must be a whole number (0 or more)");
    }

    data.stock = stock;
  }

  if (!partial || has("categoryId")) {
    const categoryId = toId(body.categoryId);

    if (!categoryId) {
      throw httpError(400, "Please select a category");
    }

    data.categoryId = categoryId;
  }

  if (has("isActive")) {
    data.isActive = parseBoolean(body.isActive, true);
  }

  if (has("isFeatured")) {
    data.isFeatured = parseBoolean(body.isFeatured, false);
  }

  return data;
};

const assertPriceLogic = (price, oldPrice) => {
  if (
    oldPrice !== null &&
    oldPrice !== undefined &&
    Number(oldPrice) <= Number(price)
  ) {
    throw httpError(
      400,
      "Old price must be higher than the current price"
    );
  }
};

// Validate sizes, colors and scents.
const assertOptionsExist = async (sizeIds, colorIds, scentIds) => {
  if (sizeIds && sizeIds.length) {
    const count = await prisma.size.count({
      where: { id: { in: sizeIds } },
    });

    if (count !== sizeIds.length) {
      throw httpError(
        400,
        "One or more selected sizes do not exist"
      );
    }
  }

  if (colorIds && colorIds.length) {
    const count = await prisma.color.count({
      where: { id: { in: colorIds } },
    });

    if (count !== colorIds.length) {
      throw httpError(
        400,
        "One or more selected colors do not exist"
      );
    }
  }

  if (scentIds && scentIds.length) {
    const count = await prisma.scent.count({
      where: { id: { in: scentIds } },
    });

    if (count !== scentIds.length) {
      throw httpError(
        400,
        "One or more selected scents do not exist"
      );
    }
  }
};

const uniqueSlug = async (base, ignoreId = null) => {
  const root = slugify(base) || `product-${Date.now()}`;
  let candidate = root;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
    });

    if (!existing || existing.id === ignoreId) {
      return candidate;
    }

    candidate = `${root}-${counter++}`;
  }
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

// ======================================
// GET ALL PRODUCTS FOR ADMIN
// active + inactive
// ======================================

const getAdminProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        ...adminInclude,
        _count: {
          select: {
            orderItems: true,
            cartItems: true,
            wishlists: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      totalProducts: products.length,
      products,
    });
  } catch (error) {
    sendError(res, error, "Failed to fetch products");
  }
};

// ======================================
// CREATE PRODUCT
// multiple images: field "images"
// ======================================

const createProduct = async (req, res) => {
  const uploaded = [];

  try {
    const data = readProductFields(req.body, { partial: false });

    assertPriceLogic(data.price, data.oldPrice);

    const sizeIds = parseIdList(req.body.sizeIds);
    const colorIds = parseIdList(req.body.colorIds);
    const scentIds = parseIdList(req.body.scentIds);

    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw httpError(404, "Category not found");
    }

    await assertOptionsExist(sizeIds, colorIds, scentIds);

    const files = req.files || [];

    if (files.length > MAX_IMAGES) {
      throw httpError(
        400,
        `You can upload up to ${MAX_IMAGES} images`
      );
    }

    const slug = await uniqueSlug(req.body.slug || data.name);

    for (const file of files) {
      uploaded.push(await uploadImage(file, "products"));
    }

    const ordered = orderImages(
      uploaded.map((image, index) => ({
        key: `new:${index}`,
        image,
      })),
      req.body.imageOrder
    ).map((entry) => entry.image);

    const product = await prisma.product.create({
      data: {
        ...data,
        slug,

        image: ordered[0]?.url || null,

        images: {
          create: ordered.map((image, index) => ({
            url: image.url,
            storageKey: image.key,
            position: index,
          })),
        },

        sizes: {
          create: sizeIds.map((sizeId) => ({
            sizeId,
          })),
        },

        colors: {
          create: colorIds.map((colorId) => ({
            colorId,
          })),
        },

        scents: {
          create: scentIds.map((scentId) => ({
            scentId,
          })),
        },
      },

      include: adminInclude,
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    // Don't leave orphan files behind when the product could not be saved.
    await Promise.all(
      uploaded.map((image) => deleteImage(image.key))
    );

    sendError(res, error, "Failed to create product");
  }
};

// ======================================
// UPDATE PRODUCT
//   images: new files to add
//   existingImageIds: JSON array with the ids (in the wanted order)
//     of the current images to KEEP.
//     Omit it to leave the current images untouched.
// ======================================

const updateProduct = async (req, res) => {
  const uploaded = [];

  try {
    const productId = toId(req.params.id);

    if (!productId) {
      throw httpError(400, "Invalid product ID");
    }

    const existing = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!existing) {
      throw httpError(404, "Product not found");
    }

    const data = readProductFields(req.body, {
      partial: true,
    });

    assertPriceLogic(
      data.price !== undefined
        ? data.price
        : existing.price,

      data.oldPrice !== undefined
        ? data.oldPrice
        : existing.oldPrice
    );

    if (data.categoryId !== undefined) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw httpError(404, "Category not found");
      }
    }

    let sizeIds = null;
    let colorIds = null;
    let scentIds = null;

    if (req.body.sizeIds !== undefined) {
      sizeIds = parseIdList(req.body.sizeIds);
    }

    if (req.body.colorIds !== undefined) {
      colorIds = parseIdList(req.body.colorIds);
    }

    if (req.body.scentIds !== undefined) {
      scentIds = parseIdList(req.body.scentIds);
    }

    await assertOptionsExist(
      sizeIds,
      colorIds,
      scentIds
    );

    if (
      req.body.slug !== undefined &&
      cleanText(req.body.slug)
    ) {
      data.slug = await uniqueSlug(
        req.body.slug,
        productId
      );
    }

    // ---- images ----

    const files = req.files || [];

    const keepIds =
      req.body.existingImageIds !== undefined
        ? parseIdList(req.body.existingImageIds)
        : null;

    const keptImages = keepIds
      ? keepIds
          .map((id) =>
            existing.images.find(
              (image) => image.id === id
            )
          )
          .filter(Boolean)
      : existing.images;

    if (
      keptImages.length + files.length >
      MAX_IMAGES
    ) {
      throw httpError(
        400,
        `A product can have up to ${MAX_IMAGES} images`
      );
    }

    const touchImages =
      keepIds !== null || files.length > 0;

    let removedImages = [];

    if (touchImages) {
      for (const file of files) {
        uploaded.push(
          await uploadImage(file, "products")
        );
      }

      removedImages = existing.images.filter(
        (image) =>
          !keptImages.some(
            (kept) => kept.id === image.id
          )
      );
    }

    const finalImages = orderImages(
      [
        ...keptImages.map((row) => ({
          key: String(row.id),
          row,
        })),

        ...uploaded.map((image, index) => ({
          key: `new:${index}`,
          image,
        })),
      ],
      req.body.imageOrder
    );

    await prisma.$transaction(async (tx) => {
      // ---- images ----

      if (touchImages) {
        if (removedImages.length) {
          await tx.productImage.deleteMany({
            where: {
              id: {
                in: removedImages.map(
                  (image) => image.id
                ),
              },
            },
          });
        }

        for (
          let index = 0;
          index < finalImages.length;
          index += 1
        ) {
          const entry = finalImages[index];

          if (entry.row) {
            await tx.productImage.update({
              where: {
                id: entry.row.id,
              },
              data: {
                position: index,
              },
            });
          } else {
            await tx.productImage.create({
              data: {
                url: entry.image.url,
                storageKey: entry.image.key,
                position: index,
                productId,
              },
            });
          }
        }

        const cover = finalImages[0];

        data.image = cover
          ? cover.row
            ? cover.row.url
            : cover.image.url
          : null;
      }

      // ---- product basic data ----

      await tx.product.update({
        where: { id: productId },
        data,
      });

      // ---- sizes ----

      if (sizeIds !== null) {
        await tx.productSize.deleteMany({
          where: { productId },
        });

        if (sizeIds.length) {
          await tx.productSize.createMany({
            data: sizeIds.map((sizeId) => ({
              productId,
              sizeId,
            })),
          });
        }
      }

      // ---- colors ----

      if (colorIds !== null) {
        await tx.productColor.deleteMany({
          where: { productId },
        });

        if (colorIds.length) {
          await tx.productColor.createMany({
            data: colorIds.map((colorId) => ({
              productId,
              colorId,
            })),
          });
        }
      }

      // ---- scents ----

      if (scentIds !== null) {
        await tx.productScent.deleteMany({
          where: { productId },
        });

        if (scentIds.length) {
          await tx.productScent.createMany({
            data: scentIds.map((scentId) => ({
              productId,
              scentId,
            })),
          });
        }
      }
    });

    // Files of removed images can go now that the DB
    // no longer points to them.
    await Promise.all(
      removedImages.map((image) =>
        deleteImage(image.storageKey)
      )
    );

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: adminInclude,
    });

    res.json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    await Promise.all(
      uploaded.map((image) =>
        deleteImage(image.key)
      )
    );

    sendError(
      res,
      error,
      "Failed to update product"
    );
  }
};

// ======================================
// DELETE PRODUCT
// ======================================

const deleteProduct = async (req, res) => {
  try {
    const productId = toId(req.params.id);

    if (!productId) {
      throw httpError(400, "Invalid product ID");
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: true,
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
    });

    if (!product) {
      throw httpError(404, "Product not found");
    }

    if (product._count.orderItems > 0) {
      throw httpError(
        400,
        "Cannot delete a product that belongs to existing orders. Deactivate it instead."
      );
    }

    await prisma.$transaction([
      prisma.cartItem.deleteMany({
        where: { productId },
      }),

      prisma.wishlist.deleteMany({
        where: { productId },
      }),

      prisma.product.delete({
        where: { id: productId },
      }),
    ]);

    await Promise.all(
      product.images.map((image) =>
        deleteImage(image.storageKey)
      )
    );

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    sendError(
      res,
      error,
      "Failed to delete product"
    );
  }
};

// ======================================
// TOGGLES
// ======================================

const toggleProductStatus = async (req, res) => {
  try {
    const productId = toId(req.params.id);

    if (!productId) {
      throw httpError(400, "Invalid product ID");
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw httpError(404, "Product not found");
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        isActive: !product.isActive,
      },
    });

    res.json({
      success: true,
      message: updated.isActive
        ? "Product activated successfully"
        : "Product deactivated successfully",
      product: updated,
    });
  } catch (error) {
    sendError(
      res,
      error,
      "Failed to update product status"
    );
  }
};

const toggleFeaturedStatus = async (req, res) => {
  try {
    const productId = toId(req.params.id);

    if (!productId) {
      throw httpError(400, "Invalid product ID");
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw httpError(404, "Product not found");
    }

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        isFeatured: !product.isFeatured,
      },
    });

    res.json({
      success: true,
      message: updated.isFeatured
        ? "Product added to featured products"
        : "Product removed from featured products",
      product: updated,
    });
  } catch (error) {
    sendError(
      res,
      error,
      "Failed to update featured status"
    );
  }
};

module.exports = {
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  toggleFeaturedStatus,
};

