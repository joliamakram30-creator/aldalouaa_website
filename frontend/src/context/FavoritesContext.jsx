/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";
import { useStore } from "./StoreContext";

const FavoritesContext = createContext(null);
const GUEST_KEY = "dalouaa_favorites_v2";

const loadGuest = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(GUEST_KEY));
    return Array.isArray(saved) ? saved.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
};

// Guests keep favourites in the browser; logged-in customers keep them on
// their account (guest favourites are merged in at login).
export function FavoritesProvider({ children }) {
  const { isLoggedIn, user } = useAuth();
  const { products } = useStore();
  const [ids, setIds] = useState(loadGuest);

  useEffect(() => {
    if (!isLoggedIn) localStorage.setItem(GUEST_KEY, JSON.stringify(ids));
  }, [ids, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      setIds(loadGuest());
      return undefined;
    }

    let active = true;
    (async () => {
      try {
        const guest = loadGuest();
        let data;
        if (guest.length) {
          ({ data } = await api.post("/favorites/merge", { productIds: guest }));
          localStorage.removeItem(GUEST_KEY);
        } else {
          ({ data } = await api.get("/favorites"));
        }
        if (active) setIds((data.favorites || []).map((entry) => entry.productId ?? entry.product?.id));
      } catch (error) {
        console.warn("Could not load favorites:", error?.response?.data?.message || error.message);
      }
    })();

    return () => {
      active = false;
    };
  }, [isLoggedIn, user?.id]);

  const favorites = useMemo(() => products.filter((product) => ids.includes(product.id)), [products, ids]);

  const isFavorite = useCallback((id) => ids.includes(id), [ids]);

  const toggleFavorite = useCallback(
    async (product) => {
      const id = Number(product.id);
      const wasFavorite = ids.includes(id);

      // optimistic update, rolled back if the server refuses
      setIds((prev) => (wasFavorite ? prev.filter((x) => x !== id) : [...prev, id]));

      if (!isLoggedIn) return;

      try {
        if (wasFavorite) await api.delete(`/favorites/${id}`);
        else await api.post("/favorites", { productId: id });
      } catch {
        setIds((prev) => (wasFavorite ? [...prev, id] : prev.filter((x) => x !== id)));
      }
    },
    [ids, isLoggedIn]
  );

  const value = useMemo(() => ({ favorites, isFavorite, toggleFavorite }), [favorites, isFavorite, toggleFavorite]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
