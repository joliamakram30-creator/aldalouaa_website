import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PageLayout from "../components/PageLayout";
import { useLanguage } from "../context/LanguageContext";

function NotFound() {
  const nav = useNavigate();
  const { t } = useLanguage();

  return (
    <PageLayout>
      <main className="empty-state page-shell">
        <span className="hero-eyebrow">404</span>
        <h2>{t("oops")}</h2>
        <p>{t("pageMissing")}</p>
        <button className="btn btn-primary" onClick={() => nav("/")}>
          {t("backHome")} <ArrowLeft size={16} />
        </button>
      </main>
    </PageLayout>
  );
}

export default NotFound;
