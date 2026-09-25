
// ======================================
// releaseOrderStock
// ======================================
// Restores stock for every item of an order, exactly once.
//
// Stock rules:
//
// 1. Size × Color stock:
//    - If the product has variants:
//      - Restore the exact ProductVariant.stock
//      - Restore Product.stock
//
// 2. Scent stock:
//    - If the order item has a scent:
//      - Restore the matching ProductScent.stock
//    - Scent stock is completely independent
//      from Size × Color stock.
//
// 3. If the product has no variants:
//    - Restore Product.stock only
//
// Important:
// - Scent is NOT part of ProductVariant.
// - Product.stock represents Size × Color / normal product stock,
//   NOT scent stock.
// - Must always be called with a Prisma transaction client ("tx").
//
// Returns:
//   true  -> stock was released just now
//   false -> order not found, or stock was already released
// ======================================

const releaseOrderStock = async (tx, orderId) => {
  const order = await tx.order.findUnique({
    where: {
      id: orderId,
    },

    include: {
      items: {
        include: {
          product: {
            include: {
              variants: {
                include: {
                  size: true,
                  color: true,
                },
              },

              scents: {
                include: {
                  scent: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order || order.stockReleased) {
    return false;
  }

  for (const item of order.items) {
    const product = item.product;

    if (!product) {
      continue;
    }

    /*
      ========================================================
      1. RESTORE SIZE × COLOR STOCK
      ========================================================
    */

    if (product.variants.length > 0) {
      const variant = product.variants.find((variant) => {
        const variantSize =
          variant.size?.name || null;

        const variantColor =
          variant.color?.name || null;

        const orderSize =
          item.size || null;

        const orderColor =
          item.color || null;

        return (
          variantSize === orderSize &&
          variantColor === orderColor
        );
      });

      /*
        The exact Size × Color variant must exist.
      */

      if (!variant) {
        throw new Error(
          `Cannot release stock: variant not found for order item ${item.id}`
        );
      }

      /*
        Restore the exact Size × Color variant stock.
      */

      await tx.productVariant.update({
        where: {
          id: variant.id,
        },

        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });

      /*
        Restore total Product.stock.

        IMPORTANT:
        Product.stock represents the total Size × Color
        stock. Scent stock is NOT added here.
      */

      await tx.product.update({
        where: {
          id: item.productId,
        },

        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });
    } else {
      /*
        ======================================================
        PRODUCT WITHOUT VARIANTS
        ======================================================
      */

      await tx.product.update({
        where: {
          id: item.productId,
        },

        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });
    }

    /*
      ========================================================
      2. RESTORE SCENT STOCK INDEPENDENTLY
      ========================================================

      Scent is NOT part of ProductVariant.

      Example:

      M + Black + Vanilla

      restores:
        M + Black  -> ProductVariant.stock
        Vanilla    -> ProductScent.stock

      These two stocks are completely independent.
    */

    if (item.scent) {
      const productScent = product.scents.find((productScent) => {
        return (
          (productScent.scent?.name || "") === item.scent
        );
      });

      /*
        The exact ProductScent must exist if the order
        contained a scent.
      */

      if (!productScent) {
        throw new Error(
          `Cannot release stock: scent "${item.scent}" not found for order item ${item.id}`
        );
      }

      /*
        Restore the scent stock only.

        DO NOT modify Product.stock here.
      */

      await tx.productScent.update({
        where: {
          productId_scentId: {
            productId: item.productId,
            scentId: productScent.scentId,
          },
        },

        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });
    }
  }

  /*
    ========================================================
    MARK ORDER AS STOCK RELEASED
    ========================================================

    This happens only after every stock restoration succeeds.

    If any operation above throws an error, the surrounding
    transaction will roll everything back and stockReleased
    will remain false.
  */

  await tx.order.update({
    where: {
      id: orderId,
    },

    data: {
      stockReleased: true,
    },
  });

  return true;
};

module.exports = {
  releaseOrderStock,
};

