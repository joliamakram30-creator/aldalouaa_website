import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import PageLayout from "../components/PageLayout";
import ProductCard from "../components/ProductCard";
import { useFavorites } from "../context/FavoritesContext";
import { useLanguage } from "../context/LanguageContext";

function Favorites() {
  const { favorites } = useFavorites();
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <PageLayout>
      <main className="page-shell">
        <div className="page-title">
          <span>{t("favorite")}</span>
          <h1>{t("myFavorites")}</h1>
          <p>{t("savedLater")}</p>
        </div>

        {favorites.length === 0 ? (
          <section className="empty-state">
            <img src="/empty-pink.svg" alt={t("emptyFavoritesAlt")} />
            <h2>{t("noFavorites")}</h2>
            <p>{t("startAdding")}</p>
            <button className="btn btn-primary" onClick={() => navigate("/shop")}>
              {t("discoverFavorites")} <Heart size={16} />
            </button>
          </section>
        ) : (
          <section className="products-section favorites-grid-section">
            <div className="products-grid">
              {favorites.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>
    </PageLayout>
  );
}

export default Favorites;
