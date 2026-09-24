import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout";
import ProductCard from "../components/ProductCard";
import StoreState from "../components/StoreState";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";

function Shop() {
  const [params, setParams] = useSearchParams();
  const categorySlug = params.get("category") || "";
  const { products, categories, loading, error } = useStore();
  const { t, categoryLabel, pick } = useLanguage();
  const [sort, setSort] = useState("newest");

  const filtered = useMemo(() => {
    const list = categorySlug ? products.filter((p) => p.category?.slug === categorySlug) : [...products];
    if (sort === "priceAsc") list.sort((a, b) => a.price - b.price);
    if (sort === "priceDesc") list.sort((a, b) => b.price - a.price);
    return list;
  }, [categorySlug, products, sort]);

  return (
    <PageLayout>
      <main className="page-shell">
        <div className="page-title">
          <span>{t("collection")}</span>
          <h1>{t("shop")}</h1>
          <p>{t("findNext")}</p>
        </div>

        {loading || error ? (
          <StoreState />
        ) : (
          <>
            <div className="filter-row">
              <button className={!categorySlug ? "active" : ""} onClick={() => setParams({})}>
                {t("all")}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={categorySlug === c.slug ? "active" : ""}
                  onClick={() => setParams({ category: c.slug })}
                >
                  {categoryLabel(c)}
                </button>
              ))}
            </div>

            <section className="products-section shop-products">
              <div className="shop-toolbar">
                <div className="shop-count">
                  {filtered.length} {t("products")}
                </div>
                <select className="shop-sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label={pick("Sort", "ترتيب")}>
                  <option value="newest">{pick("Newest", "الأحدث")}</option>
                  <option value="priceAsc">{pick("Price: low to high", "السعر: الأقل أولًا")}</option>
                  <option value="priceDesc">{pick("Price: high to low", "السعر: الأعلى أولًا")}</option>
                </select>
              </div>

              {filtered.length === 0 ? (
                <div className="empty-state">
                  <h2>{pick("No products here yet", "مفيش منتجات في القسم ده لسه")}</h2>
                </div>
              ) : (
                <div className="products-grid">
                  {filtered.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </PageLayout>
  );
}

export default Shop;
