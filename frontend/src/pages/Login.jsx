import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import PageLayout from "../components/PageLayout";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";
import { apiErrorMessage } from "../utils/apiErrors";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { config } = useStore();
  const { t, isArabic } = useLanguage();
  const nav = useNavigate();
  const location = useLocation();

  // where to go after a successful login (back to checkout, admin panel, ...)
  function goAfterLogin(user) {
    nav(location.state?.from || (user.role === "ADMIN" ? "/admin" : "/"), { replace: true });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(email.trim(), password);
      goAfterLogin(user);
    } catch (err) {
      setError(apiErrorMessage(err, isArabic, t("unableLogin")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageLayout>
      <main className="auth-page">
        <div className="auth-card">
          <Link to="/" className="back-to-shop">
            <ArrowLeft size={18} />
            {t("backToShop")}
          </Link>

          <span className="hero-eyebrow">{t("welcome")}</span>
          <h1>{t("login")}</h1>
          <p className="auth-subtitle">{t("accessFavorites")}</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={submit} className="auth-form">
            <label>
              {t("emailAddress")}
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("emailAddress")}
              />
            </label>

            <label>
              {t("password")}
              <div className="password-field">
                <input
                  required
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("yourPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? t("hidePassword") : t("showPassword")}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <button disabled={loading} className="btn btn-primary auth-submit" type="submit">
              {loading ? t("loggingIn") : t("login")}
            </button>
          </form>

          {config.googleClientId && (
            <>
              <div className="or-divider">
                <span>{t("or")}</span>
              </div>
              <GoogleSignInButton onSuccess={goAfterLogin} onError={setError} />
            </>
          )}

          <p className="auth-switch">
            {t("noAccount")} <Link to="/register" state={location.state}>{t("createOne")}</Link>
          </p>
        </div>
      </main>
    </PageLayout>
  );
}

export default Login;
