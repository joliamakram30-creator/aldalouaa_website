import { Mail, MessageCircle, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

// Contact links come from frontend/.env - only the ones you fill in are shown:
//   VITE_CONTACT_EMAIL, VITE_WHATSAPP (e.g. 201023603882), VITE_INSTAGRAM_URL, VITE_FACEBOOK_URL
const env = import.meta.env;
const email = env.VITE_CONTACT_EMAIL;
const whatsapp = String(env.VITE_WHATSAPP || "").replace(/[^\d]/g, "");
const instagram = env.VITE_INSTAGRAM_URL;
const facebook = env.VITE_FACEBOOK_URL;

function Footer() {
  const { t, isArabic } = useLanguage();
  const hasContact = email || whatsapp || instagram || facebook;

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <div className="footer-logo">AL DALOUAA</div>
          <p>{t("feminineEssentials")}</p>
          <p className="footer-trust">{isArabic ? "ثقة منذ 1995" : "Trusted since 1995"}</p>
        </div>

        <div className="footer-links">
          <Link to="/shop">{t("shop")}</Link>
          <Link to="/categories">{t("categories")}</Link>
          <Link to="/about">{t("ourStory")}</Link>
          <Link to="/favorites">{t("favorites")}</Link>
        </div>

        {hasContact && (
          <div className="footer-social">
            {email && (
              <a href={`mailto:${email}`} aria-label={isArabic ? "البريد الإلكتروني" : "Email"}>
                <Mail size={17} />
              </a>
            )}
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">
                <MessageCircle size={17} />
              </a>
            )}
            {instagram && (
              <a href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="footer-text-link">
                IG
              </a>
            )}
            {facebook && (
              <a href={facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="footer-text-link">
                FB
              </a>
            )}
          </div>
        )}
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Al Dalouaa. {isArabic ? "جميع الحقوق محفوظة." : "All rights reserved."}</span>

        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <ArrowUp size={15} />
          {t("backTop")}
        </button>
      </div>
    </footer>
  );
}

export default Footer;
