import axios from "axios";

// Backend address. Set VITE_API_URL in frontend/.env (e.g. https://api.your-site.com/api)
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

// Uploaded images are served by the backend under /uploads
export const API_ORIGIN = new URL(API_URL, window.location.href).origin;

export const TOKEN_KEY = "dalouaa_token";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Let the browser/Axios set the multipart boundary for file uploads.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});

// An expired / invalid token => tell the app to log the user out.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error?.config?.url || "";
    const isAuthForm = url.includes("/auth/login") || url.includes("/auth/register");
    if (error?.response?.status === 401 && !isAuthForm && localStorage.getItem(TOKEN_KEY)) {
      window.dispatchEvent(new Event("dalouaa:unauthorized"));
    }
    return Promise.reject(error);
  }
);

// "/uploads/products/x.jpg" -> "http://localhost:5000/uploads/products/x.jpg"
export function assetUrl(url) {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("/uploads")) return `${API_ORIGIN}${url}`;
  return url;
}

export default api;
