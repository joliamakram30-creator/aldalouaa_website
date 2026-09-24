import { useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";

function Categories() {
  const navigate = useNavigate();
  const { t, categoryLabel } = useLanguage();
  const { categories } = useStore();

  if (!categories.length) return null;

  return (
    <section className="categories-section">
      <div className="section-heading">
        <span>{t("shopByCategory")}</span>
        <h2>{t("findFavorite")}</h2>
        <p>{t("categoryText")}</p>
      </div>
      <div className="categories-circles">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className="category-circle"
            onClick={() => navigate(`/shop?category=${encodeURIComponent(cat.slug)}`)}
          >
            <div className="circle-image">
              {cat.img ? <img src={cat.img} alt={categoryLabel(cat)} loading="lazy" /> : <div className="circle-image-empty" />}
            </div>
            <span>{categoryLabel(cat)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default Categories;
