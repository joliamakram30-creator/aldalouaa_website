import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout";
import HeroSlider from "../components/HeroSlider";
import Categories from "../components/Categories";
import ProductsSection from "../components/ProductsSection";
import StoreState from "../components/StoreState";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";

function Home() {
  const navigate = useNavigate();
  const { t, pick } = useLanguage();
  const { isAdmin } = useAuth();
  const { products, loading, error } = useStore();

  const featured = products.filter((p) => p.isFeatured).slice(0, 4);
  const newest = products.slice(0, 8);

  return (
    <PageLayout>
      <main>
        <section className="hero">
          <div className="hero-content">
            <span className="hero-eyebrow">{t("newCollection")}</span>
            {/* Slogan + "trusted since" line: Arabic or English depending on the chosen language */}
            <h1>{pick("A story in every home", "لينا جوا كل بيت حكاية")}</h1>
            <div className="hero-trust">{pick("Trusted since 1995", "ثقة منذ 1995")}</div>
            <p>{t("heroText")}</p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => navigate("/shop")}>
                {t("shopCollection")}
              </button>
              <button
                className="btn btn-outline"
                onClick={() => document.getElementById("categories")?.scrollIntoView({ behavior: "smooth" })}
              >
                {t("exploreCategories")}
              </button>
              {isAdmin && (
                <button className="btn btn-outline admin-home-button" onClick={() => navigate("/admin")}>
                  {pick("Admin Dashboard", "لوحة تحكم الأدمن")}
                </button>
              )}
            </div>
          </div>
          <HeroSlider />
        </section>

        {loading || error ? (
          <StoreState />
        ) : (
          <>
            <div id="categories">
              <Categories />
            </div>
            <ProductsSection eyebrow={t("bestSellers").toUpperCase()} title={t("bestSellers")} products={featured} />
            <ProductsSection
              eyebrow={pick("JUST IN", "وصل حديثًا")}
              title={pick("New in the store", "جديد المتجر")}
              products={newest}
            />
            {products.length === 0 && (
              <section className="empty-state">
                <h2>{pick("Products are coming soon", "المنتجات جاية قريب")}</h2>
                <p>{pick("We're getting the collection ready. Come back soon!", "بنجهز المجموعة، ارجعي تزورينا قريب!")}</p>
              </section>
            )}
          </>
        )}
      </main>
    </PageLayout>
  );
}

export default Home;
