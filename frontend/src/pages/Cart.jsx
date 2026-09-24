import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import PageLayout from "../components/PageLayout";
import { useCart } from "../context/CartContext";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";
import { apiErrorMessage } from "../utils/apiErrors";

function Cart() {
  const { cartItems, removeFromCart, updateQuantity, totalPrice } = useCart();
  const { config } = useStore();
  const navigate = useNavigate();
  const { t, isArabic, pick, nameOf, categoryLabel, colorLabel, money } = useLanguage();
  const [notice, setNotice] = useState("");

  const hasUnavailable = cartItems.some((item) => !item.available);
  const threshold = config.freeShippingThreshold;
  const remainingForFree = threshold > 0 ? Math.max(0, threshold - totalPrice) : 0;

  async function run(action) {
    setNotice("");
    const result = await action();
    if (!result.ok) {
      setNotice(result.error ? apiErrorMessage(result.error, isArabic) : isArabic ? "الكمية المتاحة محدودة." : result.message);
    }
  }

  return (
    <PageLayout>
      <main className="page-shell">
        <div className="page-title">
          <span>{t("yourBag")}</span>
          <h1>{t("shoppingCart")}</h1>
          <p>
            {cartItems.length} {cartItems.length !== 1 ? t("items") : t("item")} {t("selectedForYou")}
          </p>
        </div>

        {cartItems.length === 0 ? (
          <section className="empty-state">
            <img src="/empty-pink.svg" alt={t("emptyCartAlt")} />
            <h2>{t("emptyCartTitle")}</h2>
            <p>{t("emptyCartText")}</p>
            <button className="btn btn-primary" onClick={() => navigate("/shop")}>
              {t("startShopping")} <ArrowRight size={16} />
            </button>
          </section>
        ) : (
          <div className="cart-layout">
            <section className="cart-list">
              {notice && <div className="auth-error">{notice}</div>}

              {cartItems.map((item) => (
                <div className={`cart-item ${item.available ? "" : "cart-item-unavailable"}`} key={item.key}>
                  <Link to={`/product/${item.productId}`}>
                    <img src={item.product.img} alt={nameOf(item.product)} />
                  </Link>
                  <div className="cart-item-info">
                    <span>{categoryLabel(item.product.category)}</span>
                    <h3>{nameOf(item.product)}</h3>
                    {item.size && (
                      <small>
                        {t("size")}: {item.size}
                      </small>
                    )}
                    {item.color && (
                      <small>
                        {t("color")}: {item.colorObj ? colorLabel(item.colorObj) : item.color}
                      </small>
                    )}
                    {item.scent && (
                      <small>
                        {t("scent")}: {item.scentObj ? (isArabic ? item.scentObj.nameAr || item.scentObj.name : item.scentObj.name) : item.scent}
                      </small>
                    )}
                    <strong>{money(item.product.price)}</strong>

                    {item.available ? (
                      <div className="qty-control">
                        <button
                          onClick={() => run(() => updateQuantity(item, item.quantity - 1))}
                          disabled={item.quantity <= 1}
                          aria-label={t("decrease")}
                        >
                          <Minus size={14} />
                        </button>
                        <b>{item.quantity}</b>
                        <button
                          onClick={() => run(() => updateQuantity(item, item.quantity + 1))}
                          disabled={item.quantity >= item.maxQuantity}
                          aria-label={t("increase")}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <small className="cart-soldout">{t("soldOut")}</small>
                    )}
                  </div>
                  <button className="remove-item" onClick={() => run(() => removeFromCart(item))} aria-label={pick("Remove", "حذف")}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}

              <button className="continue-shopping" onClick={() => navigate("/shop")}>
                <ArrowRight size={16} /> {t("continueShopping")}
              </button>
            </section>

            <aside className="order-summary">
              <h2>{t("orderSummary")}</h2>
              <div className="summary-total">
                <span>{t("subtotal")}</span>
                <strong>{money(totalPrice)}</strong>
              </div>
              <div>
                <span>{t("shipping")}</span>
                <b>{pick("Calculated at checkout", "بتتحسب في إتمام الطلب")}</b>
              </div>

              {hasUnavailable && (
                <p className="cart-soldout">
                  {pick("Remove sold-out items to continue.", "احذفي المنتجات اللي نفدت علشان تكملي.")}
                </p>
              )}

              <button
                className="btn btn-primary checkout-btn"
                onClick={() => navigate("/checkout")}
                disabled={hasUnavailable}
              >
                {t("proceedCheckout")}
              </button>

              {threshold > 0 && (
                <p>
                  {remainingForFree > 0
                    ? pick(
                        `Add ${money(remainingForFree)} more to get free shipping.`,
                        `ضيفي ${money(remainingForFree)} كمان علشان الشحن يبقى مجاني.`
                      )
                    : pick("🎉 You get free shipping!", "🎉 الشحن مجاني عليكي!")}
                </p>
              )}
            </aside>
          </div>
        )}
      </main>
    </PageLayout>
  );
}

export default Cart;
