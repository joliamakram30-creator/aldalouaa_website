import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout";
import StoreState from "../components/StoreState";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";

function CategoriesPage() {
  const nav = useNavigate();
  const { t, categoryLabel } = useLanguage();
  const { categories, loading, error } = useStore();

  return (
    <PageLayout>
      <main className="page-shell">
        <div className="page-title">
          <span>{t("explore")}</span>
          <h1>{t("categories")}</h1>
          <p>{t("pickMood")}</p>
        </div>

        {loading || error ? (
          <StoreState />
        ) : (
          <div className="category-grid-page">
            {categories.map((c) => (
              <button key={c.id} className="category-tile" onClick={() => nav(`/shop?category=${encodeURIComponent(c.slug)}`)}>
                {c.img ? <img src={c.img} alt={categoryLabel(c)} loading="lazy" /> : <div className="category-tile-empty" />}
                <div>
                  <span>{t("shopLabel")}</span>
                  <h2>{categoryLabel(c)}</h2>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </PageLayout>
  );
}

export default CategoriesPage;
