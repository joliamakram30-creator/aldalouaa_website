/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";
import { useStore } from "./StoreContext";

const CartContext = createContext(null);

const GUEST_KEY = "dalouaa_cart_v2";
const MAX_PER_LINE = 20;

const loadGuest = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(GUEST_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

// The cart is stored as small "lines" (productId, size, color, quantity).
// Names, images and prices are always read live from the products in the
// store, so a price change in the admin panel shows up in every cart.
export function CartProvider({ children }) {
  const { isLoggedIn, user } = useAuth();
  const { products } = useStore();
  const [lines, setLines] = useState(loadGuest);

  const applyServerCart = useCallback((cart) => {
    setLines(
      (cart?.items || []).map((item) => ({
        cartItemId: item.id,
        productId: item.productId,
        size: item.size || "",
        color: item.color || "",
        scent: item.scent || "",
        quantity: item.quantity,
      }))
    );
  }, []);

  // Guest cart lives in the browser.
  useEffect(() => {
    if (!isLoggedIn) localStorage.setItem(GUEST_KEY, JSON.stringify(lines));
  }, [lines, isLoggedIn]);

  // Login: move the guest cart into the account cart. Logout: back to an empty guest cart.
  useEffect(() => {
    if (!isLoggedIn) {
      setLines(loadGuest());
      return undefined;
    }

    let active = true;
    (async () => {
      try {
        const guest = loadGuest();
        let data;
        if (guest.length) {
          ({ data } = await api.post("/cart/merge", { items: guest }));
          localStorage.removeItem(GUEST_KEY);
        } else {
          ({ data } = await api.get("/cart"));
        }
        if (active) applyServerCart(data.cart);
      } catch (error) {
        console.warn("Could not load the cart:", error?.response?.data?.message || error.message);
      }
    })();

    return () => {
      active = false;
    };
  }, [isLoggedIn, user?.id, applyServerCart]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const cartItems = useMemo(
    () =>
      lines
        .map((line) => {
          const product = productById.get(line.productId);
          if (!product) return null;
          const limit = Math.min(product.stock, MAX_PER_LINE);
          return {
            key: `${line.productId}|${line.size}|${line.color}|${line.scent}`,
            cartItemId: line.cartItemId,
            productId: line.productId,
            product,
            size: line.size,
            color: line.color,
            scent: line.scent,
            scentObj: product.scents.find((s) => s.name === line.scent) || null,
            colorObj: product.colors.find((c) => c.name === line.color) || null,
            quantity: line.quantity,
            maxQuantity: limit,
            available: product.stock > 0,
          };
        })
        .filter(Boolean),
    [lines, productById]
  );

  const totalItems = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
  const totalPrice = useMemo(
    () => cartItems.reduce((sum, item) => sum + Math.round(item.product.price * 100) * item.quantity, 0) / 100,
    [cartItems]
  );

  const errorResult = (error) => ({
    ok: false,
    error,
    message: error?.response?.data?.message || "",
  });

  // Returns { ok: true } or { ok: false, message, error }
  const addToCart = useCallback(
    async (product, { size = "", color = "", scent = "", quantity = 1 } = {}) => {
      const qty = Math.max(1, Math.floor(Number(quantity) || 1));

      if (product.stock < 1) return { ok: false, message: "This product is out of stock" };
      if (product.sizes.length && !size) return { ok: false, message: "Please select a size" };
      if (product.colors.length && !color) return { ok: false, message: "Please select a color" };
      if (product.scents.length && !scent) return { ok: false, message: "Please select a scent" };

      if (isLoggedIn) {
        try {
          const { data } = await api.post("/cart", { productId: product.id, quantity: qty, size, color, scent });
          applyServerCart(data.cart);
          return { ok: true };
        } catch (error) {
          return errorResult(error);
        }
      }

      const limit = Math.min(product.stock, MAX_PER_LINE);
      const existing = lines.find((l) => l.productId === product.id && l.size === size && l.color === color && l.scent === scent);
      if ((existing?.quantity || 0) + qty > limit) {
        return { ok: false, message: `Only ${limit} available in stock for this product` };
      }

      setLines((prev) =>
        existing
          ? prev.map((l) => (l === existing ? { ...l, quantity: l.quantity + qty } : l))
          : [...prev, { productId: product.id, size, color, scent, quantity: qty }]
      );
      return { ok: true };
    },
    [isLoggedIn, lines, applyServerCart]
  );

  const updateQuantity = useCallback(
    async (item, quantity) => {
      const qty = Math.max(1, Math.min(Math.floor(Number(quantity) || 1), item.maxQuantity || MAX_PER_LINE));

      if (isLoggedIn) {
        try {
          const { data } = await api.put(`/cart/items/${item.cartItemId}`, { quantity: qty });
          applyServerCart(data.cart);
          return { ok: true };
        } catch (error) {
          return errorResult(error);
        }
      }

      setLines((prev) =>
        prev.map((l) =>
          l.productId === item.productId && l.size === item.size && l.color === item.color && l.scent === item.scent ? { ...l, quantity: qty } : l
        )
      );
      return { ok: true };
    },
    [isLoggedIn, applyServerCart]
  );

  const removeFromCart = useCallback(
    async (item) => {
      if (isLoggedIn) {
        try {
          const { data } = await api.delete(`/cart/items/${item.cartItemId}`);
          applyServerCart(data.cart);
          return { ok: true };
        } catch (error) {
          return errorResult(error);
        }
      }

      setLines((prev) =>
        prev.filter((l) => !(l.productId === item.productId && l.size === item.size && l.color === item.color && l.scent === item.scent))
      );
      return { ok: true };
    },
    [isLoggedIn, applyServerCart]
  );

  // Called after an order is placed (the server already emptied the account cart).
  const clearCart = useCallback(async () => {
    if (isLoggedIn) {
      try {
        const { data } = await api.delete("/cart");
        applyServerCart(data.cart);
        return;
      } catch {
        /* fall through */
      }
    }
    setLines([]);
  }, [isLoggedIn, applyServerCart]);

  // Re-read the account cart from the server (e.g. after an order).
  const refreshCart = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const { data } = await api.get("/cart");
      applyServerCart(data.cart);
    } catch {
      /* keep what we have */
    }
  }, [isLoggedIn, applyServerCart]);

  const value = useMemo(
    () => ({ cartItems, totalItems, totalPrice, addToCart, updateQuantity, removeFromCart, clearCart, refreshCart }),
    [cartItems, totalItems, totalPrice, addToCart, updateQuantity, removeFromCart, clearCart, refreshCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
