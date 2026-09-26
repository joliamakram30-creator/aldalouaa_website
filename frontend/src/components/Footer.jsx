import { ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

function InstagramIcon({ size = 17 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ size = 17 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TikTokIcon({ size = 17 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18a4 4 0 1 0 4-4V4c1.5 2.5 3.2 3.5 6 3.5" />
    </svg>
  );
}

function WhatsAppIcon({ size = 17 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-9 8.5 8.5 8.5 0 0 1-4.1-1.05L3 20l1.15-4.55A8.4 8.4 0 0 1 3.5 11.5a8.5 8.5 0 1 1 17.5 0Z" />
      <path d="M8.5 9.5c.2-.4.4-.45.75-.45h.55c.2 0 .4.05.5.4l.65 1.55c.1.25.05.45-.1.65l-.45.55c-.1.15-.15.3-.05.5.25.5.7 1 1.2 1.35.45.35 1.05.7 1.6.9.2.1.35.05.5-.1l.6-.7c.15-.2.35-.25.6-.15l1.45.7c.25.1.35.3.3.55-.1.55-.35 1.05-.8 1.35-.4.3-.95.35-1.5.25-1.25-.2-2.55-.9-3.55-1.7-1.1-.9-2-2-2.65-3.2-.35-.7-.55-1.5-.35-2.2.1-.35.35-.65.75-.95Z" />
    </svg>
  );
}

function Footer() {
  const { t, isArabic } = useLanguage();

  const env = import.meta.env;

  const instagram = env.VITE_INSTAGRAM_URL;
  const facebook = env.VITE_FACEBOOK_URL;
  const tiktok = env.VITE_TIKTOK_URL;
  const whatsapp = env.VITE_WHATSAPP_URL;

  const hasContact = instagram || facebook || tiktok || whatsapp;

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <div className="footer-logo">AL DALOUAA</div>

          <p>{t("feminineEssentials")}</p>

          <p className="footer-trust">
            {isArabic ? "ثقة منذ 1995" : "Trusted since 1995"}
          </p>
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
              <a
                href={instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
              >
                <InstagramIcon />
              </a>
            )}

            {facebook && (
              <a
                href={facebook}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
              >
                <FacebookIcon />
              </a>
            )}

            {tiktok && (
              <a
                href={tiktok}
                target="_blank"
                rel="noreferrer"
                aria-label="TikTok"
              >
                <TikTokIcon />
              </a>
            )}

            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
              >
                <WhatsAppIcon />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} Al Dalouaa.{" "}
          {isArabic ? "جميع الحقوق محفوظة." : "All rights reserved."}
        </span>

        <button
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            })
          }
        >
          <ArrowUp size={15} />
          {t("backTop")}
        </button>
      </div>
    </footer>
  );
}

export default Footer;