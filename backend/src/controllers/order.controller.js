
const prisma = require("../config/prisma");

const {
  uploadImage,
  deleteImage,
} = require("../services/storage");

const {
  calculateShipping,
} = require("../utils/shipping");

const {
  generateOrderNumber,
} = require("../utils/orderNumber");

const {
  releaseOrderStock,
} = require("../utils/stock");

const {
  normalizeEgyptPhone,
  cleanText,
  toCents,
  fromCents,
  toId,
} = require("../utils/helpers");

// Card / Visa / Mastercard payment has been removed completely.
const ALLOWED_PAYMENT_METHODS = [
  "CASH_ON_DELIVERY",
  "VODAFONE_CASH",
];

const getInitialPaymentStatus = (
  method
) =>
  method === "VODAFONE_CASH"
    ? "PENDING_VERIFICATION"
    : "UNPAID";

const orderItemProduct = {
  select: {
    id: true,
    name: true,
    nameAr: true,
    image: true,
  },
};

const httpError = (
  status,
  message
) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/*
  ============================================================
  SIZE + COLOR STOCK HELPERS
  ============================================================

  ProductVariant represents ONLY:

      Size + Color

  Scent is completely independent.
*/

const hasVariantStock = (
  product
) => {
  return (
    Array.isArray(product.variants) &&
    product.variants.length > 0
  );
};

const findProductVariant = (
  product,
  size,
  color
) => {
  if (!hasVariantStock(product)) {
    return null;
  }

  return (
    product.variants.find(
      (variant) => {
        const variantSize =
          variant.size?.name || "";

        const variantColor =
          variant.color?.name || "";

        return (
          variantSize === size &&
          variantColor === color
        );
      }
    ) || null
  );
};

const getVariantStock = (
  product,
  size,
  color
) => {
  /*
    Backward compatibility:

    Products without ProductVariant rows
    still use Product.stock.
  */
  if (!hasVariantStock(product)) {
    return Math.max(
      0,
      Number(product.stock || 0)
    );
  }

  const variant =
    findProductVariant(
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

  ProductScent represents:

      Product + Scent + stock

  Scent stock is NOT connected to ProductVariant.
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
    product.scents.find(
      (productScent) => {
        const scentName =
          productScent.scent?.name || "";

        return scentName === scent;
      }
    ) || null
  );
};

const getScentStock = (
  product,
  scent
) => {
  /*
    No selected scent means there is
    no independent scent stock to check.
  */
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
  CREATE ORDER / CHECKOUT
  ============================================================
*/

const createOrder = async (
  req,
  res
) => {
  let proofUpload = null;

  try {
    const userId =
      req.user.userId;

    const customerName =
      cleanText(
        req.body.customerName,
        100
      );

    const address =
      cleanText(
        req.body.address,
        500
      );

    const customerPhone =
      normalizeEgyptPhone(
        req.body.customerPhone
      );

    const paymentMethod =
      req.body.paymentMethod;

    const zoneId =
      toId(
        req.body.governorateId
      );

    if (
      customerName.length < 2
    ) {
      throw httpError(
        400,
        "Please enter your full name"
      );
    }

    if (!customerPhone) {
      throw httpError(
        400,
        "Please enter a valid Egyptian mobile number (01XXXXXXXXX)"
      );
    }

    if (address.length < 8) {
      throw httpError(
        400,
        "Please enter your full delivery address"
      );
    }

    if (!zoneId) {
      throw httpError(
        400,
        "Please select your governorate"
      );
    }

    if (
      !ALLOWED_PAYMENT_METHODS.includes(
        paymentMethod
      )
    ) {
      throw httpError(
        400,
        "Invalid or missing payment method"
      );
    }

    const zone =
      await prisma.shippingZone.findUnique(
        {
          where: {
            id: zoneId,
          },
        }
      );

    if (
      !zone ||
      !zone.isActive
    ) {
      throw httpError(
        400,
        "Delivery is not available to the selected governorate"
      );
    }

    /*
      ========================================================
      VODAFONE CASH
      ========================================================
    */

    let senderPhone = null;
    let transactionId = null;

    if (
      paymentMethod ===
      "VODAFONE_CASH"
    ) {
      senderPhone =
        normalizeEgyptPhone(
          req.body.senderPhone
        );

      transactionId =
        cleanText(
          req.body.transactionId,
          64
        );

      if (!senderPhone) {
        throw httpError(
          400,
          "Please enter the Vodafone Cash number you paid from"
        );
      }

      if (
        transactionId.length < 4
      ) {
        throw httpError(
          400,
          "Please enter the transaction ID"
        );
      }

      if (!req.file) {
        throw httpError(
          400,
          "Payment proof screenshot is required for Vodafone Cash"
        );
      }
    }

    /*
      ========================================================
      LOAD CART
      ========================================================
    */

    const cart =
      await prisma.cart.findUnique(
        {
          where: {
            userId,
          },

          include: {
            items: {
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

                    /*
                      ProductScent includes its
                      independent stock.
                    */
                    scents: {
                      include: {
                        scent: true,
                      },
                    },

                    /*
                      ProductVariant contains ONLY
                      Size + Color + stock.
                    */
                    variants: {
                      include: {
                        size: true,
                        color: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }
      );

    if (
      !cart ||
      cart.items.length === 0
    ) {
      throw httpError(
        400,
        "Your cart is empty"
      );
    }

    /*
      ========================================================
      VALIDATE PRODUCTS + OPTIONS + BOTH STOCK SYSTEMS
      ========================================================
    */

    for (const item of cart.items) {
      const product =
        item.product;

      if (
        !product ||
        !product.isActive
      ) {
        throw httpError(
          400,
          `${
            product?.nameAr ||
            product?.name ||
            "A product"
          } is no longer available`
        );
      }

      const sizeNames =
        product.sizes.map(
          (entry) =>
            entry.size.name
        );

      const colorNames =
        product.colors.map(
          (entry) =>
            entry.color.name
        );

      const scentNames =
        product.scents.map(
          (entry) =>
            entry.scent.name
        );

      /*
        ======================================================
        VALIDATE SIZE
        ======================================================
      */

      if (
        sizeNames.length > 0 &&
        !sizeNames.includes(
          item.size
        )
      ) {
        throw httpError(
          400,
          `Please choose the size again for ${
            product.nameAr ||
            product.name
          }`
        );
      }

      /*
        ======================================================
        VALIDATE COLOR
        ======================================================
      */

      if (
        colorNames.length > 0 &&
        !colorNames.includes(
          item.color
        )
      ) {
        throw httpError(
          400,
          `Please choose the color again for ${
            product.nameAr ||
            product.name
          }`
        );
      }

      /*
        ======================================================
        VALIDATE SCENT
        ======================================================
      */

      if (
        scentNames.length > 0 &&
        !scentNames.includes(
          item.scent
        )
      ) {
        throw httpError(
          400,
          `Please choose the scent again for ${
            product.nameAr ||
            product.name
          }`
        );
      }

      /*
        ======================================================
        CHECK SIZE + COLOR STOCK
        ======================================================
      */

      const variantStock =
        getVariantStock(
          product,
          item.size || "",
          item.color || ""
        );

      if (
        variantStock <
        item.quantity
      ) {
        throw httpError(
          400,
          `Not enough stock for ${
            product.nameAr ||
            product.name
          }${
            item.color
              ? ` - ${item.color}`
              : ""
          }${
            item.size
              ? ` - ${item.size}`
              : ""
          }`
        );
      }

      /*
        ======================================================
        CHECK INDEPENDENT SCENT STOCK
        ======================================================
      */

      if (item.scent) {
        const scentStock =
          getScentStock(
            product,
            item.scent
          );

        if (
          scentStock === null ||
          scentStock <
            item.quantity
        ) {
          throw httpError(
            400,
            `Not enough stock for scent ${
              item.scent
            } for ${
              product.nameAr ||
              product.name
            }`
          );
        }
      }
    }

    /*
      ========================================================
      PRICES
      ========================================================
    */

    const subtotalCents =
      cart.items.reduce(
        (total, item) =>
          total +
          toCents(
            item.product.price
          ) *
            item.quantity,
        0
      );

    const subtotal =
      fromCents(
        subtotalCents
      );

    const shippingCost =
      await calculateShipping(
        zone,
        subtotal
      );

    const totalAmount =
      fromCents(
        subtotalCents +
          toCents(
            shippingCost
          )
      );

    /*
      ========================================================
      PAYMENT PROOF UPLOAD
      ========================================================
    */

    if (
      paymentMethod ===
      "VODAFONE_CASH"
    ) {
      proofUpload =
        await uploadImage(
          req.file,
          "proofs"
        );
    }

    /*
      ========================================================
      ORDER + PAYMENT + STOCK
      ========================================================
    */

    let order = null;
    let attemptsLeft = 3;

    while (
      attemptsLeft > 0
    ) {
      const orderNumber =
        generateOrderNumber();

      try {
        order =
          await prisma.$transaction(
            async (tx) => {
              /*
                ==================================================
                CREATE ORDER
                ==================================================
              */

              const newOrder =
                await tx.order.create({
                  data: {
                    orderNumber,

                    subtotal,
                    shippingCost,
                    totalAmount,

                    customerName,
                    customerPhone,
                    address,
                    city: zone.nameAr,

                    userId,

                    items: {
                      create:
                        cart.items.map(
                          (item) => ({
                            productId:
                              item.productId,

                            quantity:
                              item.quantity,

                            price:
                              item.product.price,

                            productName:
                              item.product
                                .name,

                            size:
                              item.size ||
                              null,

                            color:
                              item.color ||
                              null,

                            scent:
                              item.scent ||
                              null,
                          })
                        ),
                    },

                    payment: {
                      create: {
                        method:
                          paymentMethod,

                        status:
                          getInitialPaymentStatus(
                            paymentMethod
                          ),

                        senderPhone,
                        transactionId,

                        proofImage:
                          proofUpload?.url ||
                          null,
                      },
                    },
                  },
                });

              /*
                ==================================================
                ATOMIC STOCK DECREMENT
                ==================================================

                TWO INDEPENDENT STOCK SYSTEMS:

                1. ProductVariant.stock
                   = Size + Color stock

                2. ProductScent.stock
                   = Scent stock

                Product.stock
                   = total Size + Color stock only

                Scent stock is NEVER included in Product.stock.
              */

              for (const item of cart.items) {
                const product =
                  item.product;

                /*
                  =================================================
                  SIZE + COLOR STOCK
                  =================================================
                */

                const variantsExist =
                  await tx.productVariant.count(
                    {
                      where: {
                        productId:
                          item.productId,
                      },
                    }
                  );

                if (
                  variantsExist > 0
                ) {
                  /*
                    Find exact Size + Color variant.
                  */

                  const variant =
                    await tx.productVariant.findFirst(
                      {
                        where: {
                          productId:
                            item.productId,

                          size: item.size
                            ? {
                                name:
                                  item.size,
                              }
                            : undefined,

                          color: item.color
                            ? {
                                name:
                                  item.color,
                              }
                            : undefined,
                        },
                      }
                    );

                  if (!variant) {
                    throw httpError(
                      400,
                      `This size/color combination is not available for ${
                        product.nameAr ||
                        product.name
                      }`
                    );
                  }

                  /*
                    Atomic decrement of exact
                    Size + Color stock.
                  */

                  const updatedVariant =
                    await tx.productVariant.updateMany(
                      {
                        where: {
                          id:
                            variant.id,

                          stock: {
                            gte:
                              item.quantity,
                          },
                        },

                        data: {
                          stock: {
                            decrement:
                              item.quantity,
                          },
                        },
                      }
                    );

                  if (
                    updatedVariant.count ===
                    0
                  ) {
                    throw httpError(
                      400,
                      `Not enough stock for ${
                        product.nameAr ||
                        product.name
                      }${
                        item.color
                          ? ` - ${item.color}`
                          : ""
                      }${
                        item.size
                          ? ` - ${item.size}`
                          : ""
                      }`
                    );
                  }

                  /*
                    Product.stock is the TOTAL of
                    Size + Color stock.

                    It does NOT include scent stock.
                  */

                  const updatedProduct =
                    await tx.product.updateMany(
                      {
                        where: {
                          id:
                            item.productId,

                          stock: {
                            gte:
                              item.quantity,
                          },
                        },

                        data: {
                          stock: {
                            decrement:
                              item.quantity,
                          },
                        },
                      }
                    );

                  if (
                    updatedProduct.count ===
                    0
                  ) {
                    throw httpError(
                      400,
                      `Not enough total stock for ${
                        product.nameAr ||
                        product.name
                      }`
                    );
                  }
                } else {
                  /*
                    =================================================
                    BACKWARD COMPATIBILITY
                    =================================================

                    Old product without ProductVariant rows.

                    In this case Product.stock remains
                    the stock source.
                  */

                  const updatedProduct =
                    await tx.product.updateMany(
                      {
                        where: {
                          id:
                            item.productId,

                          stock: {
                            gte:
                              item.quantity,
                          },
                        },

                        data: {
                          stock: {
                            decrement:
                              item.quantity,
                          },
                        },
                      }
                    );

                  if (
                    updatedProduct.count ===
                    0
                  ) {
                    throw httpError(
                      400,
                      `Not enough stock for ${
                        product.nameAr ||
                        product.name
                      }`
                    );
                  }
                }

                /*
                  =================================================
                  INDEPENDENT SCENT STOCK
                  =================================================

                  IMPORTANT:

                  This is NOT a ProductVariant.

                  We find the ProductScent using:

                      productId + scentId

                  and decrement ONLY ProductScent.stock.
                */

                if (item.scent) {
                  /*
                    Find the exact ProductScent row.
                  */

                  const productScent =
                    await tx.productScent.findFirst(
                      {
                        where: {
                          productId:
                            item.productId,

                          scent: {
                            name:
                              item.scent,
                          },
                        },
                      }
                    );

                  if (!productScent) {
                    throw httpError(
                      400,
                      `The selected scent ${item.scent} is not available for ${
                        product.nameAr ||
                        product.name
                      }`
                    );
                  }

                  /*
                    Atomic scent stock decrement.

                    This stock is completely independent
                    from Size + Color stock.
                  */

                  const updatedScent =
                    await tx.productScent.updateMany(
                      {
                        where: {
                          productId:
                            item.productId,

                          scentId:
                            productScent.scentId,

                          stock: {
                            gte:
                              item.quantity,
                          },
                        },

                        data: {
                          stock: {
                            decrement:
                              item.quantity,
                          },
                        },
                      }
                    );

                  if (
                    updatedScent.count ===
                    0
                  ) {
                    throw httpError(
                      400,
                      `Not enough stock for scent ${
                        item.scent
                      } for ${
                        product.nameAr ||
                        product.name
                      }`
                    );
                  }
                }
              }

              /*
                ==================================================
                CLEAR CART
                ==================================================

                Only happens after ALL stock decrements
                succeeded.

                If any stock operation throws,
                the whole transaction rolls back.
              */

              await tx.cartItem.deleteMany(
                {
                  where: {
                    cartId:
                      cart.id,
                  },
                }
              );

              /*
                Notifications are intentionally
                outside this transaction.
              */

              return tx.order.findUnique({
                where: {
                  id: newOrder.id,
                },

                include: {
                  items: {
                    include: {
                      product:
                        orderItemProduct,
                    },
                  },

                  payment: true,
                },
              });
            }
          );

        break;
      } catch (txError) {
        const isOrderNumberCollision =
          txError.code ===
            "P2002" &&
          JSON.stringify(
            txError.meta || {}
          ).includes(
            "orderNumber"
          );

        attemptsLeft -= 1;

        if (
          !isOrderNumberCollision ||
          attemptsLeft === 0
        ) {
          throw txError;
        }
      }
    }

    /*
      ========================================================
      ADMIN NOTIFICATION
      ========================================================
    */

    try {
      const admins =
        await prisma.user.findMany(
          {
            where: {
              role: "ADMIN",
            },

            select: {
              id: true,
            },
          }
        );

      if (admins.length) {
        await prisma.notification.createMany(
          {
            data: admins.map(
              (admin) => ({
                adminId:
                  admin.id,

                type: "ORDER",

                title:
                  "New order",

                message:
                  `New order ${order.orderNumber} from ${customerName} — ${totalAmount} EGP`,

                link:
                  `/admin/orders?search=${encodeURIComponent(
                    order.orderNumber
                  )}`,
              })
            ),
          }
        );
      }
    } catch (
      notificationError
    ) {
      console.error(
        "Create Admin Order Notification Error:",
        notificationError
      );
    }

    /*
      ========================================================
      RESPONSE
      ========================================================
    */

    res.status(201).json({
      success: true,

      message:
        paymentMethod ===
        "VODAFONE_CASH"
          ? "Order created. Your payment is pending verification by the admin."
          : "Order created successfully",

      order,
    });
  } catch (error) {
    /*
      If order creation failed after
      uploading Vodafone Cash proof,
      remove the uploaded image.
    */

    if (proofUpload) {
      await deleteImage(
        proofUpload.key
      );
    }

    if (error.status) {
      return res.status(
        error.status
      ).json({
        success: false,
        message:
          error.message,
      });
    }

    console.error(
      "Create Order Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to create order",
    });
  }
};

/*
  ============================================================
  GET MY ORDERS
  ============================================================
*/

const getMyOrders = async (
  req,
  res
) => {
  try {
    const orders =
      await prisma.order.findMany(
        {
          where: {
            userId:
              req.user.userId,
          },

          include: {
            items: {
              include: {
                product:
                  orderItemProduct,
              },
            },

            payment: {
              select: {
                method: true,
                status: true,
                senderPhone: true,
                transactionId: true,
                reviewNotes: true,
              },
            },
          },

          orderBy: {
            createdAt: "desc",
          },
        }
      );

    res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(
      "Get My Orders Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch orders",
    });
  }
};

/*
  ============================================================
  GET SINGLE ORDER
  ============================================================
*/

const getOrderById = async (
  req,
  res
) => {
  try {
    const id = toId(
      req.params.id
    );

    if (!id) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found",
      });
    }

    const order =
      await prisma.order.findFirst(
        {
          where: {
            id,
            userId:
              req.user.userId,
          },

          include: {
            items: {
              include: {
                product:
                  orderItemProduct,
              },
            },

            payment: true,
          },
        }
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found",
      });
    }

    res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error(
      "Get Order Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to fetch order",
    });
  }
};

/*
  ============================================================
  CANCEL MY ORDER
  ============================================================
*/

const cancelMyOrder = async (
  req,
  res
) => {
  try {
    const id = toId(
      req.params.id
    );

    if (!id) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found",
      });
    }

    const order =
      await prisma.order.findFirst(
        {
          where: {
            id,
            userId:
              req.user.userId,
          },

          include: {
            payment: true,
          },
        }
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found",
      });
    }

    if (
      order.status !==
        "PENDING" ||
      order.payment?.method !==
        "CASH_ON_DELIVERY"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "This order can no longer be cancelled online. Please contact the store.",
      });
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.order.update({
          where: {
            id,
          },

          data: {
            status:
              "CANCELLED",
          },
        });

        /*
          releaseOrderStock will restore:

          1. ProductVariant.stock
          2. Product.stock
          3. ProductScent.stock

          after we update stock.js.
        */

        await releaseOrderStock(
          tx,
          id
        );
      }
    );

    res.json({
      success: true,
      message:
        "Order cancelled successfully",
    });
  } catch (error) {
    console.error(
      "Cancel Order Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Failed to cancel order",
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelMyOrder,
};

