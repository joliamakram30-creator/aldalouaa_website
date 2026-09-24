// English / Arabic labels for order + payment values coming from the API.
export const ORDER_STATUS = {
  PENDING: ["Pending", "قيد الانتظار"],
  CONFIRMED: ["Confirmed", "تم التأكيد"],
  PROCESSING: ["Processing", "قيد التجهيز"],
  SHIPPED: ["Shipped", "تم الشحن"],
  DELIVERED: ["Delivered", "تم التسليم"],
  CANCELLED: ["Cancelled", "ملغي"],
};

export const PAYMENT_METHOD = {
  CASH_ON_DELIVERY: ["Cash on Delivery", "الدفع عند الاستلام"],
  VODAFONE_CASH: ["Vodafone Cash", "فودافون كاش"],
};

export const PAYMENT_STATUS = {
  UNPAID: ["Unpaid", "لم يتم الدفع"],
  PENDING_VERIFICATION: ["Pending verification", "قيد المراجعة"],
  PAID: ["Paid", "تم الدفع"],
  REJECTED: ["Rejected", "مرفوض"],
};

export const label = (map, key, isArabic) => (map[key] || [key, key])[isArabic ? 1 : 0];
