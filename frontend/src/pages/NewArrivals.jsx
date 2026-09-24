import PageLayout from "../components/PageLayout";
import ProductCard from "../components/ProductCard";
import StoreState from "../components/StoreState";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";

function NewArrivals() {
  const { products, loading, error } = useStore();
  const { t } = useLanguage();

  return (
    <PageLayout>
      <main className="page-shell">
        <div className="page-title">
          <span>{t("justIn")}</span>
          <h1>{t("arrivals")}</h1>
          <p>{t("storeFresh")}</p>
        </div>
        {loading || error ? (
          <StoreState />
        ) : (
          <section className="products-section">
            <div className="products-grid">
              {/* the API already returns newest first */}
              {products.slice(0, 24).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>
    </PageLayout>
  );
}

export default NewArrivals;
