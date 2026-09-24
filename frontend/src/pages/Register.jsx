import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import PageLayout from "../components/PageLayout";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";
import { apiErrorMessage } from "../utils/apiErrors";

function Register() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { config } = useStore();
  const { t, isArabic, pick } = useLanguage();
  const nav = useNavigate();
  const location = useLocation();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    if (form.password.length < 8) {
      setError(t("passwordLength"));
      return;
    }

    setLoading(true);

    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });

      // registering also logs the customer in
      nav(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err, isArabic, t("unableCreate")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageLayout>
      <main className="auth-page">
        <div className="auth-card">
          <span className="hero-eyebrow">{t("join")}</span>
          <h1>{t("createAccount")}</h1>
          <p className="auth-subtitle">{t("saveTrack")}</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={submit} className="auth-form">
            <label>
              {t("fullName")}
              <input required name="name" autoComplete="name" value={form.name} onChange={handleChange} placeholder={t("yourFullName")} />
            </label>

            <label>
              {t("emailAddress")}
              <input
                required
                type="email"
                name="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder={t("emailAddress")}
              />
            </label>

            <label>
              {t("phone")} <small>({pick("optional", "اختياري")})</small>
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                inputMode="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="01XXXXXXXXX"
                dir="ltr"
              />
            </label>

            <label>
              {t("password")}
              <div className="password-field">
                <input
                  required
                  type={show ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder={t("atLeast6")}
                />
                <button type="button" onClick={() => setShow(!show)} aria-label={show ? t("hidePassword") : t("showPassword")}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <label>
              {t("confirmNewPassword")}
              <input
                required
                type={show ? "text" : "password"}
                name="confirmPassword"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder={t("reenterPassword")}
              />
            </label>

            <button disabled={loading} className="btn btn-primary auth-submit" type="submit">
              {loading ? t("creating") : t("createAccount")}
            </button>
          </form>

          {config.googleClientId && (
            <>
              <div className="or-divider">
                <span>{t("or")}</span>
              </div>
              <GoogleSignInButton
                onSuccess={() => nav(location.state?.from || "/", { replace: true })}
                onError={setError}
              />
            </>
          )}

          <p className="auth-switch">
            {t("alreadyAccount")} <Link to="/login" state={location.state}>{t("login")}</Link>
          </p>
        </div>
      </main>
    </PageLayout>
  );
}

export default Register;
