import { ArrowUp } from "lucide-react";

// lucide-react no longer ships brand/logo icons (Instagram, Facebook, etc.),
// so these two are small inline SVGs sized to match the other footer icons.
function InstagramIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ size = 17 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

// Social links come from frontend/.env - only the ones you fill in are shown:
//   VITE_INSTAGRAM_URL, VITE_FACEBOOK_URL
const env = import.meta.env;
const instagram = env.VITE_INSTAGRAM_URL;
const facebook = env.VITE_FACEBOOK_URL;

function Footer() {
  const { t, isArabic } = useLanguage();
  const hasContact = instagram || facebook;

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
            {instagram && (
              <a href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
                <InstagramIcon />
              </a>
            )}
            {facebook && (
              <a href={facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
                <FacebookIcon />
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