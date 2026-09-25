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
  // SIZE × COLOR VARIANT STOCK
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

const httpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

// ======================================
// IMAGE ORDER
// ======================================

const orderImages = (entries, rawOrder) => {
  if (rawOrder === undefined) {
    return entries;
  }

  const lookup = new Map(
    entries.map((entry) => [entry.key, entry])
  );

  const ordered = [];
  const seen = new Set();

  for (const key of parseArray(rawOrder).map(String)) {
    const entry = lookup.get(key);

    if (entry && !seen.has(entry)) {
      ordered.push(entry);
      seen.add(entry);
    }
  }

  return [
    ...ordered,
    ...entries.filter(
      (entry) => !seen.has(entry)
    ),
  ];
};

// ======================================
// PRODUCT BASIC FIELDS
// ======================================

const readProductFields = (
  body,
  { partial }
) => {
  const data = {};

  const has = (key) =>
    body[key] !== undefined;

  // --------------------------------------
  // NAME
  // --------------------------------------

  if (
    !partial ||
    has("name") ||
    has("nameAr")
  ) {
    const name = cleanText(
      body.name,
      191
    );

    const nameAr = cleanText(
      body.nameAr,
      191
    );

    if (!name && !nameAr) {
      throw httpError(
        400,
        "Product name is required"
      );
    }

    data.name =
      name || nameAr;

    data.nameAr =
      nameAr || null;
  }

  // --------------------------------------
  // DESCRIPTION
  // --------------------------------------

  if (
    !partial ||
    has("description")
  ) {
    data.description =
      cleanText(
        body.description,
        10000
      ) || null;
  }

  if (
    !partial ||
    has("descriptionAr")
  ) {
    data.descriptionAr =
      cleanText(
        body.descriptionAr,
        10000
      ) || null;
  }

  // --------------------------------------
  // PRICE
  // --------------------------------------

  if (
    !partial ||
    has("price")
  ) {
    const price = Number(
      body.price
    );

    if (
      body.price === undefined ||
      body.price === "" ||
      Number.isNaN(price) ||
      price <= 0
    ) {
      throw httpError(
        400,
        "Price must be a number greater than 0"
      );
    }

    if (price > 10000000) {
      throw httpError(
        400,
        "Price is too large"
      );
    }

    data.price =
      Math.round(
        price * 100
      ) / 100;
  }

  // --------------------------------------
  // OLD PRICE
  // --------------------------------------

  if (
    !partial ||
    has("oldPrice")
  ) {
    if (
      body.oldPrice === undefined ||
      body.oldPrice === null ||
      body.oldPrice === ""
    ) {
      data.oldPrice = null;
    } else {
      const oldPrice = Number(
        body.oldPrice
      );

      if (
        Number.isNaN(oldPrice) ||
        oldPrice <= 0
      ) {
        throw httpError(
          400,
          "Old price must be a number greater than 0"
        );
      }

      data.oldPrice =
        Math.round(
          oldPrice * 100
        ) / 100;
    }
  }

  // --------------------------------------
  // PRODUCT STOCK
  //
  // IMPORTANT:
  // Product.stock represents ONLY the
  // total Size × Color stock.
  //
  // Scent stock is stored separately in
  // ProductScent.stock.
  // --------------------------------------

  if (
    !partial ||
    has("stock")
  ) {
    const stock = Number(
      body.stock === undefined ||
      body.stock === ""
        ? 0
        : body.stock
    );

    if (
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      throw httpError(
        400,
        "Stock must be a whole number (0 or more)"
      );
    }

    data.stock = stock;
  }

  // --------------------------------------
  // CATEGORY
  // --------------------------------------

  if (
    !partial ||
    has("categoryId")
  ) {
    const categoryId =
      toId(body.categoryId);

    if (!categoryId) {
      throw httpError(
        400,
        "Please select a category"
      );
    }

    data.categoryId =
      categoryId;
  }

  // --------------------------------------
  // ACTIVE / FEATURED
  // --------------------------------------

  if (has("isActive")) {
    data.isActive =
      parseBoolean(
        body.isActive,
        true
      );
  }

  if (has("isFeatured")) {
    data.isFeatured =
      parseBoolean(
        body.isFeatured,
        false
      );
  }

  return data;
};

// ======================================
// PRICE LOGIC
// ======================================

const assertPriceLogic = (
  price,
  oldPrice
) => {
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

// ======================================
// OPTIONS VALIDATION
// ======================================

const assertOptionsExist = async (
  sizeIds,
  colorIds,
  scentIds
) => {
  if (
    sizeIds &&
    sizeIds.length
  ) {
    const count =
      await prisma.size.count({
        where: {
          id: {
            in: sizeIds,
          },
        },
      });

    if (
      count !== sizeIds.length
    ) {
      throw httpError(
        400,
        "One or more selected sizes do not exist"
      );
    }
  }

  if (
    colorIds &&
    colorIds.length
  ) {
    const count =
      await prisma.color.count({
        where: {
          id: {
            in: colorIds,
          },
        },
      });

    if (
      count !== colorIds.length
    ) {
      throw httpError(
        400,
        "One or more selected colors do not exist"
      );
    }
  }

  if (
    scentIds &&
    scentIds.length
  ) {
    const count =
      await prisma.scent.count({
        where: {
          id: {
            in: scentIds,
          },
        },
      });

    if (
      count !== scentIds.length
    ) {
      throw httpError(
        400,
        "One or more selected scents do not exist"
      );
    }
  }
};

// ======================================
// VARIANT STOCK HELPERS
// ======================================

/*
  Size × Color stock only.

  Example:

  [
    {
      sizeId: 1,
      colorId: 1,
      stock: 5
    },
    {
      sizeId: 1,
      colorId: 2,
      stock: 2
    }
  ]

  Scent is NOT part of ProductVariant.
*/

const parseVariants = (
  rawVariants
) => {
  if (
    rawVariants === undefined ||
    rawVariants === null ||
    rawVariants === ""
  ) {
    return null;
  }

  let parsed = rawVariants;

  if (typeof rawVariants === "string") {
    try {
      parsed =
        JSON.parse(rawVariants);
    } catch {
      throw httpError(
        400,
        "variants must be valid JSON"
      );
    }
  }

  if (!Array.isArray(parsed)) {
    throw httpError(
      400,
      "variants must be an array"
    );
  }

  return parsed.map(
    (variant, index) => {
      if (
        !variant ||
        typeof variant !== "object"
      ) {
        throw httpError(
          400,
          `Invalid variant at index ${index}`
        );
      }

      const sizeId =
        variant.sizeId === null ||
        variant.sizeId === undefined ||
        variant.sizeId === ""
          ? null
          : toId(variant.sizeId);

      const colorId =
        variant.colorId === null ||
        variant.colorId === undefined ||
        variant.colorId === ""
          ? null
          : toId(variant.colorId);

      const stock = Number(
        variant.stock === undefined ||
        variant.stock === ""
          ? 0
          : variant.stock
      );

      if (
        sizeId === null &&
        colorId === null
      ) {
        throw httpError(
          400,
          `Variant at index ${index} must have a size or color`
        );
      }

      if (
        !Number.isInteger(stock) ||
        stock < 0
      ) {
        throw httpError(
          400,
          `Variant stock at index ${index} must be a whole number (0 or more)`
        );
      }

      return {
        sizeId,
        colorId,
        stock,
      };
    }
  );
};

// ======================================
// VALIDATE VARIANTS
// ======================================

const validateVariants = async (
  variants,
  sizeIds,
  colorIds
) => {
  if (
    variants === null
  ) {
    return;
  }

  const sizeSet =
    new Set(sizeIds || []);

  const colorSet =
    new Set(colorIds || []);

  const seen =
    new Set();

  for (
    const variant of variants
  ) {
    // ----------------------------------
    // SIZE MUST BELONG TO PRODUCT
    // ----------------------------------

    if (
      variant.sizeId !== null &&
      !sizeSet.has(
        variant.sizeId
      )
    ) {
      throw httpError(
        400,
        `Variant uses size ${variant.sizeId}, but this size is not selected for the product`
      );
    }

    // ----------------------------------
    // COLOR MUST BELONG TO PRODUCT
    // ----------------------------------

    if (
      variant.colorId !== null &&
      !colorSet.has(
        variant.colorId
      )
    ) {
      throw httpError(
        400,
        `Variant uses color ${variant.colorId}, but this color is not selected for the product`
      );
    }

    // ----------------------------------
    // NO DUPLICATE COMBINATIONS
    // ----------------------------------

    const key =
      `${variant.sizeId ?? "null"}:${variant.colorId ?? "null"}`;

    if (seen.has(key)) {
      throw httpError(
        400,
        `Duplicate variant combination: ${key}`
      );
    }

    seen.add(key);
  }
};

// ======================================
// SAVE SIZE × COLOR VARIANTS
// ======================================

/*
  This completely synchronizes
  ProductVariant rows with the Admin matrix.

  Product.stock = total Size × Color stock.

  Example:

  S / Black = 5
  S / White = 2
  M / Black = 8

  Product.stock = 15

  Scent stock is NOT included.
*/

const syncProductVariants = async (
  tx,
  productId,
  variants
) => {
  if (variants === null) {
    return null;
  }

  const totalStock =
    variants.reduce(
      (total, variant) =>
        total + variant.stock,
      0
    );

  await tx.productVariant.deleteMany({
    where: {
      productId,
    },
  });

  if (variants.length) {
    await tx.productVariant.createMany({
      data: variants.map(
        (variant) => ({
          productId,

          sizeId:
            variant.sizeId,

          colorId:
            variant.colorId,

          stock:
            variant.stock,
        })
      ),
    });
  }

  await tx.product.update({
    where: {
      id: productId,
    },

    data: {
      stock: totalStock,
    },
  });

  return totalStock;
};

// ======================================
// SCENT STOCK HELPERS
// ======================================

/*
  Scent stock is COMPLETELY independent
  from Size × Color variants.

  Example:

  [
    {
      scentId: 1,
      stock: 10
    },
    {
      scentId: 2,
      stock: 5
    }
  ]

  We do NOT add scentId to ProductVariant.
*/

const parseScentStocks = (
  rawScentStocks
) => {
  if (
    rawScentStocks === undefined ||
    rawScentStocks === null ||
    rawScentStocks === ""
  ) {
    return null;
  }

  let parsed = rawScentStocks;

  if (typeof rawScentStocks === "string") {
    try {
      parsed =
        JSON.parse(rawScentStocks);
    } catch {
      throw httpError(
        400,
        "scentStocks must be valid JSON"
      );
    }
  }

  if (!Array.isArray(parsed)) {
    throw httpError(
      400,
      "scentStocks must be an array"
    );
  }

  return parsed.map(
    (item, index) => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        throw httpError(
          400,
          `Invalid scent stock at index ${index}`
        );
      }

      const scentId =
        toId(item.scentId);

      const stock = Number(
        item.stock === undefined ||
        item.stock === ""
          ? 0
          : item.stock
      );

      if (!scentId) {
        throw httpError(
          400,
          `Invalid scent ID at index ${index}`
        );
      }

      if (
        !Number.isInteger(stock) ||
        stock < 0
      ) {
        throw httpError(
          400,
          `Scent stock at index ${index} must be a whole number (0 or more)`
        );
      }

      return {
        scentId,
        stock,
      };
    }
  );
};

// ======================================
// VALIDATE SCENT STOCKS
// ======================================

const validateScentStocks = (
  scentStocks,
  scentIds
) => {
  if (
    scentStocks === null
  ) {
    return;
  }

  const selectedScents =
    new Set(scentIds || []);

  const seen =
    new Set();

  for (
    const item of scentStocks
  ) {
    if (
      !selectedScents.has(
        item.scentId
      )
    ) {
      throw httpError(
        400,
        `Scent ${item.scentId} has stock configured but is not selected for this product`
      );
    }

    if (
      seen.has(
        item.scentId
      )
    ) {
      throw httpError(
        400,
        `Duplicate scent stock for scent ${item.scentId}`
      );
    }

    seen.add(
      item.scentId
    );
  }
};

// ======================================
// SAVE SCENT STOCKS
// ======================================

/*
  ProductScent uses the existing composite
  primary key:

  PRIMARY KEY (productId, scentId)

  We DO NOT create another ID.

  We DO NOT create another unique constraint.

  We only update ProductScent.stock.
*/

const syncProductScents = async (
  tx,
  productId,
  scentIds,
  scentStocks
) => {
  if (
    scentIds === null
  ) {
    return;
  }

  const stockMap =
    new Map(
      (scentStocks || []).map(
        (item) => [
          item.scentId,
          item.stock,
        ]
      )
    );

  const existing =
    await tx.productScent.findMany({
      where: {
        productId,
      },
    });

  const existingStockMap =
    new Map(
      existing.map(
        (item) => [
          item.scentId,
          item.stock,
        ]
      )
    );

  // --------------------------------------
  // REMOVE UNSELECTED SCENTS
  // --------------------------------------

  await tx.productScent.deleteMany({
    where: {
      productId,

      scentId: {
        notIn:
          scentIds.length
            ? scentIds
            : [-1],
      },
    },
  });

  // --------------------------------------
  // CREATE / UPDATE SELECTED SCENTS
  // --------------------------------------

  for (
    const scentId of scentIds
  ) {
    /*
      If frontend sent a stock value,
      use it.

      If it did not send a stock value
      for an existing scent, preserve
      its current stock.

      New scent defaults to 0.
    */

    const stock =
      stockMap.has(scentId)
        ? stockMap.get(scentId)
        : (
            existingStockMap.get(
              scentId
            ) ?? 0
          );

    await tx.productScent.upsert({
      where: {
        productId_scentId: {
          productId,
          scentId,
        },
      },

      update: {
        stock,
      },

      create: {
        productId,
        scentId,
        stock,
      },
    });
  }
};

// ======================================
// UNIQUE SLUG
// ======================================

const uniqueSlug = async (
  base,
  ignoreId = null
) => {
  const root =
    slugify(base) ||
    `product-${Date.now()}`;

  let candidate = root;
  let counter = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing =
      await prisma.product.findUnique({
        where: {
          slug: candidate,
        },
      });

    if (
      !existing ||
      existing.id === ignoreId
    ) {
      return candidate;
    }

    candidate =
      `${root}-${counter++}`;
  }
};

// ======================================
// ERROR RESPONSE
// ======================================

const sendError = (
  res,
  error,
  fallback
) => {
  if (error.status) {
    return res
      .status(error.status)
      .json({
        success: false,
        message: error.message,
      });
  }

  console.error(
    fallback,
    error
  );

  return res
    .status(500)
    .json({
      success: false,
      message: fallback,
    });
};

// ======================================
// GET ALL PRODUCTS FOR ADMIN
// ======================================

const getAdminProducts = async (
  req,
  res
) => {
  try {
    const products =
      await prisma.product.findMany({
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

        orderBy: {
          createdAt: "desc",
        },
      });

    res.json({
      success: true,

      totalProducts:
        products.length,

      products,
    });
  } catch (error) {
    sendError(
      res,
      error,
      "Failed to fetch products"
    );
  }
};

// ======================================
// CREATE PRODUCT
// ======================================

const createProduct = async (
  req,
  res
) => {
  const uploaded = [];

  try {
    const data =
      readProductFields(
        req.body,
        {
          partial: false,
        }
      );

    assertPriceLogic(
      data.price,
      data.oldPrice
    );

    const sizeIds =
      parseIdList(
        req.body.sizeIds
      );

    const colorIds =
      parseIdList(
        req.body.colorIds
      );

    const scentIds =
      parseIdList(
        req.body.scentIds
      );

    // ----------------------------------
    // SIZE × COLOR VARIANTS
    // ----------------------------------

    const variants =
      parseVariants(
        req.body.variants
      );

    await validateVariants(
      variants,
      sizeIds,
      colorIds
    );

    // ----------------------------------
    // SCENT STOCK
    // ----------------------------------

    const scentStocks =
      parseScentStocks(
        req.body.scentStocks
      );

    validateScentStocks(
      scentStocks,
      scentIds
    );

    // ----------------------------------
    // CATEGORY
    // ----------------------------------

    const category =
      await prisma.category.findUnique({
        where: {
          id: data.categoryId,
        },
      });

    if (!category) {
      throw httpError(
        404,
        "Category not found"
      );
    }

    // ----------------------------------
    // OPTIONS
    // ----------------------------------

    await assertOptionsExist(
      sizeIds,
      colorIds,
      scentIds
    );

    // ----------------------------------
    // IMAGES
    // ----------------------------------

    const files =
      req.files || [];

    if (
      files.length >
      MAX_IMAGES
    ) {
      throw httpError(
        400,
        `You can upload up to ${MAX_IMAGES} images`
      );
    }

    const slug =
      await uniqueSlug(
        req.body.slug ||
          data.name
      );

    for (
      const file of files
    ) {
      uploaded.push(
        await uploadImage(
          file,
          "products"
        )
      );
    }

    const ordered =
      orderImages(
        uploaded.map(
          (
            image,
            index
          ) => ({
            key: `new:${index}`,
            image,
          })
        ),
        req.body.imageOrder
      ).map(
        (entry) =>
          entry.image
      );

    // ----------------------------------
    // CREATE PRODUCT
    // ----------------------------------

    const product =
      await prisma.$transaction(
        async (tx) => {
          const totalVariantStock =
            variants !== null
              ? variants.reduce(
                  (
                    total,
                    variant
                  ) =>
                    total +
                    variant.stock,
                  0
                )
              : data.stock;

          const created =
            await tx.product.create({
              data: {
                ...data,

                slug,

                /*
                  Product.stock contains
                  ONLY Size × Color stock.

                  Scent stock is stored in
                  ProductScent.stock.
                */
                stock:
                  totalVariantStock,

                image:
                  ordered[0]?.url ||
                  null,

                images: {
                  create:
                    ordered.map(
                      (
                        image,
                        index
                      ) => ({
                        url:
                          image.url,

                        storageKey:
                          image.key,

                        position:
                          index,
                      })
                    ),
                },

                sizes: {
                  create:
                    sizeIds.map(
                      (sizeId) => ({
                        sizeId,
                      })
                    ),
                },

                colors: {
                  create:
                    colorIds.map(
                      (colorId) => ({
                        colorId,
                      })
                    ),
                },

                scents: {
                  create:
                    scentIds.map(
                      (scentId) => ({
                        scentId,

                        stock:
                          scentStocks?.find(
                            (item) =>
                              item.scentId ===
                              scentId
                          )?.stock ?? 0,
                      })
                    ),
                },
              },
            });

          // --------------------------------
          // CREATE SIZE × COLOR VARIANTS
          // --------------------------------

          if (
            variants !== null &&
            variants.length
          ) {
            await tx.productVariant.createMany({
              data:
                variants.map(
                  (variant) => ({
                    productId:
                      created.id,

                    sizeId:
                      variant.sizeId,

                    colorId:
                      variant.colorId,

                    stock:
                      variant.stock,
                  })
                ),
            });
          }

          return created;
        }
      );

    // ----------------------------------
    // FINAL PRODUCT
    // ----------------------------------

    const finalProduct =
      await prisma.product.findUnique({
        where: {
          id: product.id,
        },

        include:
          adminInclude,
      });

    res.status(201).json({
      success: true,

      message:
        "Product created successfully",

      product:
        finalProduct,
    });
  } catch (error) {
    await Promise.all(
      uploaded.map(
        (image) =>
          deleteImage(
            image.key
          )
      )
    );

    sendError(
      res,
      error,
      "Failed to create product"
    );
  }
};

// ======================================
// UPDATE PRODUCT
// ======================================

const updateProduct = async (
  req,
  res
) => {
  const uploaded = [];

  try {
    const productId =
      toId(req.params.id);

    if (!productId) {
      throw httpError(
        400,
        "Invalid product ID"
      );
    }

    const existing =
      await prisma.product.findUnique({
        where: {
          id: productId,
        },

        include: {
          images: {
            orderBy: {
              position: "asc",
            },
          },
        },
      });

    if (!existing) {
      throw httpError(
        404,
        "Product not found"
      );
    }

    const data =
      readProductFields(
        req.body,
        {
          partial: true,
        }
      );

    assertPriceLogic(
      data.price !== undefined
        ? data.price
        : existing.price,

      data.oldPrice !== undefined
        ? data.oldPrice
        : existing.oldPrice
    );

    // ----------------------------------
    // CATEGORY
    // ----------------------------------

    if (
      data.categoryId !==
      undefined
    ) {
      const category =
        await prisma.category.findUnique({
          where: {
            id: data.categoryId,
          },
        });

      if (!category) {
        throw httpError(
          404,
          "Category not found"
        );
      }
    }

    // ----------------------------------
    // OPTIONS
    // ----------------------------------

    let sizeIds = null;
    let colorIds = null;
    let scentIds = null;

    if (
      req.body.sizeIds !==
      undefined
    ) {
      sizeIds =
        parseIdList(
          req.body.sizeIds
        );
    }

    if (
      req.body.colorIds !==
      undefined
    ) {
      colorIds =
        parseIdList(
          req.body.colorIds
        );
    }

    if (
      req.body.scentIds !==
      undefined
    ) {
      scentIds =
        parseIdList(
          req.body.scentIds
        );
    }

    await assertOptionsExist(
      sizeIds,
      colorIds,
      scentIds
    );

    // ----------------------------------
    // SCENT STOCK
    // ----------------------------------

    const scentStocks =
      parseScentStocks(
        req.body.scentStocks
      );

    if (
      scentIds !== null
    ) {
      validateScentStocks(
        scentStocks,
        scentIds
      );
    } else if (
      scentStocks !== null
    ) {
      throw httpError(
        400,
        "scentIds must be provided when updating scent stock"
      );
    }

    // ----------------------------------
    // SIZE × COLOR VARIANTS
    // ----------------------------------

    const variants =
      parseVariants(
        req.body.variants
      );

    await validateVariants(
      variants,

      sizeIds !== null
        ? sizeIds
        : null,

      colorIds !== null
        ? colorIds
        : null
    );

    // ----------------------------------
    // SLUG
    // ----------------------------------

    if (
      req.body.slug !==
        undefined &&
      cleanText(
        req.body.slug
      )
    ) {
      data.slug =
        await uniqueSlug(
          req.body.slug,
          productId
        );
    }

    // ----------------------------------
    // IMAGES
    // ----------------------------------

    const files =
      req.files || [];

    const keepIds =
      req.body
        .existingImageIds !==
      undefined
        ? parseIdList(
            req.body
              .existingImageIds
          )
        : null;

    const keptImages =
      keepIds
        ? keepIds
            .map(
              (id) =>
                existing.images.find(
                  (image) =>
                    image.id === id
                )
            )
            .filter(Boolean)
        : existing.images;

    if (
      keptImages.length +
        files.length >
      MAX_IMAGES
    ) {
      throw httpError(
        400,
        `A product can have up to ${MAX_IMAGES} images`
      );
    }

    const touchImages =
      keepIds !== null ||
      files.length > 0;

    let removedImages = [];

    if (touchImages) {
      for (
        const file of files
      ) {
        uploaded.push(
          await uploadImage(
            file,
            "products"
          )
        );
      }

      removedImages =
        existing.images.filter(
          (image) =>
            !keptImages.some(
              (kept) =>
                kept.id ===
                image.id
            )
        );
    }

    const finalImages =
      orderImages(
        [
          ...keptImages.map(
            (row) => ({
              key: String(
                row.id
              ),
              row,
            })
          ),

          ...uploaded.map(
            (
              image,
              index
            ) => ({
              key: `new:${index}`,
              image,
            })
          ),
        ],

        req.body.imageOrder
      );

    // ==================================
    // TRANSACTION
    // ==================================

    await prisma.$transaction(
      async (tx) => {
        // --------------------------------
        // IMAGES
        // --------------------------------

        if (touchImages) {
          if (
            removedImages.length
          ) {
            await tx.productImage.deleteMany(
              {
                where: {
                  id: {
                    in:
                      removedImages.map(
                        (
                          image
                        ) =>
                          image.id
                      ),
                  },
                },
              }
            );
          }

          for (
            let index = 0;
            index <
            finalImages.length;
            index += 1
          ) {
            const entry =
              finalImages[index];

            if (entry.row) {
              await tx.productImage.update(
                {
                  where: {
                    id:
                      entry.row.id,
                  },

                  data: {
                    position:
                      index,
                  },
                }
              );
            } else {
              await tx.productImage.create(
                {
                  data: {
                    url:
                      entry.image
                        .url,

                    storageKey:
                      entry.image
                        .key,

                    position:
                      index,

                    productId,
                  },
                }
              );
            }
          }

          const cover =
            finalImages[0];

          data.image =
            cover
              ? cover.row
                ? cover.row.url
                : cover.image.url
              : null;
        }

        // --------------------------------
        // PRODUCT BASIC DATA
        // --------------------------------

        /*
          If variants are supplied,
          Product.stock becomes the total
          Size × Color stock.
        */

        if (
          variants !== null
        ) {
          data.stock =
            variants.reduce(
              (
                total,
                variant
              ) =>
                total +
                variant.stock,
              0
            );
        }

        await tx.product.update({
          where: {
            id: productId,
          },

          data,
        });

        // --------------------------------
        // SIZES
        // --------------------------------

        if (
          sizeIds !== null
        ) {
          await tx.productSize.deleteMany(
            {
              where: {
                productId,
              },
            }
          );

          if (sizeIds.length) {
            await tx.productSize.createMany(
              {
                data:
                  sizeIds.map(
                    (sizeId) => ({
                      productId,
                      sizeId,
                    })
                  ),
              }
            );
          }
        }

        // --------------------------------
        // COLORS
        // --------------------------------

        if (
          colorIds !== null
        ) {
          await tx.productColor.deleteMany(
            {
              where: {
                productId,
              },
            }
          );

          if (colorIds.length) {
            await tx.productColor.createMany(
              {
                data:
                  colorIds.map(
                    (colorId) => ({
                      productId,
                      colorId,
                    })
                  ),
              }
            );
          }
        }

        // --------------------------------
        // SCENTS + INDEPENDENT STOCK
        // --------------------------------

        if (
          scentIds !== null
        ) {
          await syncProductScents(
            tx,
            productId,
            scentIds,
            scentStocks
          );
        }

        // --------------------------------
        // SIZE × COLOR VARIANTS
        // --------------------------------

        if (
          variants !== null
        ) {
          await syncProductVariants(
            tx,
            productId,
            variants
          );
        }
      }
    );

    // ----------------------------------
    // DELETE REMOVED IMAGES FROM STORAGE
    // ----------------------------------

    await Promise.all(
      removedImages.map(
        (image) =>
          deleteImage(
            image.storageKey
          )
      )
    );

    // ----------------------------------
    // FINAL PRODUCT
    // ----------------------------------

    const product =
      await prisma.product.findUnique({
        where: {
          id: productId,
        },

        include:
          adminInclude,
      });

    res.json({
      success: true,

      message:
        "Product updated successfully",

      product,
    });
  } catch (error) {
    await Promise.all(
      uploaded.map(
        (image) =>
          deleteImage(
            image.key
          )
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

const deleteProduct = async (
  req,
  res
) => {
  try {
    const productId =
      toId(req.params.id);

    if (!productId) {
      throw httpError(
        400,
        "Invalid product ID"
      );
    }

    const product =
      await prisma.product.findUnique({
        where: {
          id: productId,
        },

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
      throw httpError(
        404,
        "Product not found"
      );
    }

    if (
      product._count.orderItems > 0
    ) {
      throw httpError(
        400,
        "Cannot delete a product that belongs to existing orders. Deactivate it instead."
      );
    }

    await prisma.$transaction([
      prisma.cartItem.deleteMany({
        where: {
          productId,
        },
      }),

      prisma.wishlist.deleteMany({
        where: {
          productId,
        },
      }),

      prisma.product.delete({
        where: {
          id: productId,
        },
      }),
    ]);

    await Promise.all(
      product.images.map(
        (image) =>
          deleteImage(
            image.storageKey
          )
      )
    );

    res.json({
      success: true,

      message:
        "Product deleted successfully",
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
// TOGGLE PRODUCT STATUS
// ======================================

const toggleProductStatus = async (
  req,
  res
) => {
  try {
    const productId =
      toId(req.params.id);

    if (!productId) {
      throw httpError(
        400,
        "Invalid product ID"
      );
    }

    const product =
      await prisma.product.findUnique({
        where: {
          id: productId,
        },
      });

    if (!product) {
      throw httpError(
        404,
        "Product not found"
      );
    }

    const updated =
      await prisma.product.update({
        where: {
          id: productId,
        },

        data: {
          isActive:
            !product.isActive,
        },
      });

    res.json({
      success: true,

      message:
        updated.isActive
          ? "Product activated successfully"
          : "Product deactivated successfully",

      product:
        updated,
    });
  } catch (error) {
    sendError(
      res,
      error,
      "Failed to update product status"
    );
  }
};

// ======================================
// TOGGLE FEATURED STATUS
// ======================================

const toggleFeaturedStatus =
  async (req, res) => {
    try {
      const productId =
        toId(req.params.id);

      if (!productId) {
        throw httpError(
          400,
          "Invalid product ID"
        );
      }

      const product =
        await prisma.product.findUnique({
          where: {
            id: productId,
          },
        });

      if (!product) {
        throw httpError(
          404,
          "Product not found"
        );
      }

      const updated =
        await prisma.product.update({
          where: {
            id: productId,
          },

          data: {
            isFeatured:
              !product.isFeatured,
          },
        });

      res.json({
        success: true,

        message:
          updated.isFeatured
            ? "Product added to featured products"
            : "Product removed from featured products",

        product:
          updated,
      });
    } catch (error) {
      sendError(
        res,
        error,
        "Failed to update featured status"
      );
    }
  };

// ======================================
// EXPORTS
// ======================================

module.exports = {
  getAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  toggleFeaturedStatus,
};