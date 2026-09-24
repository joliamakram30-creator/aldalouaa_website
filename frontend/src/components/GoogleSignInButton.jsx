import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";
import { apiErrorMessage } from "../utils/apiErrors";

// "Continue with Google" using Google Identity Services.
// Shown only when the store has GOOGLE_CLIENT_ID set in backend/.env.

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let scriptPromise = null;
let initializedFor = null;
const handler = { current: null }; // the latest onCredential callback (Google is initialised only once)

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null; // allow a retry later
        reject(new Error("Google script blocked"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

function GoogleSignInButton({ onSuccess, onError }) {
  const { config } = useStore();
  const { loginWithGoogle } = useAuth();
  const { language, isArabic } = useLanguage();
  const container = useRef(null);
  const [unavailable, setUnavailable] = useState(false);
  const clientId = config.googleClientId;

  // keep the latest callbacks without re-initialising Google
  useEffect(() => {
    handler.current = async ({ credential }) => {
      try {
        const user = await loginWithGoogle(credential);
        onSuccess?.(user);
      } catch (error) {
        onError?.(apiErrorMessage(error, isArabic, isArabic ? "تعذر تسجيل الدخول بجوجل." : "Google sign-in failed."));
      }
    };
  });

  useEffect(() => {
    if (!clientId) return undefined;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !container.current) return;
        const gsi = window.google.accounts.id;

        if (initializedFor !== clientId) {
          gsi.initialize({
            client_id: clientId,
            callback: (response) => handler.current?.(response),
          });
          initializedFor = clientId;
        }

        container.current.innerHTML = "";
        gsi.renderButton(container.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "left",
          width: Math.min(360, container.current.parentElement?.clientWidth || 360),
          locale: language,
        });
      })
      .catch(() => !cancelled && setUnavailable(true));

    return () => {
      cancelled = true;
    };
  }, [clientId, language]);

  if (!clientId || unavailable) return null;

  return <div className="google-signin" ref={container} />;
}

export default GoogleSignInButton;
