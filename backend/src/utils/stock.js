// ======================================
// releaseOrderStock
// ======================================
// Restores stock for every item of an order, exactly once.
//
// Must always be called with a Prisma transaction client ("tx"), not the
// top-level `prisma` client, so the stock increment and the
// `order.stockReleased` flag are written atomically together. If either
// half failed alone we'd either double-credit stock (flag not set, called
// again later) or silently lose stock (flag set, increment never happened).
//
// Returns:
//   true  -> stock was released just now
//   false -> order not found, or stock had already been released before
//            (safe no-op, so callers can call this unconditionally)
// ======================================

const releaseOrderStock = async (tx, orderId) => {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.stockReleased) {
    return false;
  }

  for (const item of order.items) {
    await tx.product.update({
      where: { id: item.productId },
      data: {
        stock: { increment: item.quantity },
      },
    });
  }

  await tx.order.update({
    where: { id: orderId },
    data: { stockReleased: true },
  });

  return true;
};

module.exports = { releaseOrderStock };
