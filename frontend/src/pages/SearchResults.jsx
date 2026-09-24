import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import PageLayout from "../components/PageLayout";
import ProductCard from "../components/ProductCard";
import StoreState from "../components/StoreState";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";

// lower-case + drop Arabic diacritics + unify alef/ya/ta-marbuta so "جلابيه" finds "جلابية"
const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .trim();

function SearchResults() {
  const [searchParams] = useSearchParams();
  const { t, isArabic } = useLanguage();
  const { products, loading, error } = useStore();
  const query = (searchParams.get("q") || "").trim();

  const results = useMemo(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (!words.length) return [];

    return products.filter((p) => {
      const haystack = normalize(
        [p.name, p.nameAr, p.description, p.descriptionAr, p.category?.name, p.category?.nameAr].join(" ")
      );
      return words.every((word) => haystack.includes(word));
    });
  }, [products, query]);

  return (
    <PageLayout>
      <main>
        <div className="search-results-header">
          <span className="hero-eyebrow">{t("searchResults")}</span>
          {!loading && !error && (
            <h1>
              {results.length > 0
                ? isArabic ? `نتائج البحث عن "${query}"` : `Results for "${query}"`
                : isArabic ? `مفيش نتائج للبحث عن "${query}"` : `No results found for "${query}"`}
            </h1>
          )}
          {!loading && !error && results.length === 0 && <p>{t("searchBrowse")}</p>}
        </div>

        {loading || error ? (
          <StoreState />
        ) : (
          results.length > 0 && (
            <section className="products-section">
              <div className="products-grid">
                {results.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          )
        )}
      </main>
    </PageLayout>
  );
}

export default SearchResults;
