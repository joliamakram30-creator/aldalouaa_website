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

const normalizeName = (value) => String(value ?? "").trim().toLowerCase();

function getColorName(color) {
return color?.name || "";
}

function getScentName(scent) {
return scent?.name || "";
}

function findVariant(product, size, color) {
if (!product?.variants?.length) {
return null;
}

const wantedSize = normalizeName(size);
const wantedColor = normalizeName(color);

return (
product.variants.find((variant) => {
const variantSize = normalizeName(
variant.size?.name || variant.sizeName || ""
);

  const variantColor = normalizeName(
    variant.color?.name || variant.colorName || ""
  );

  return variantSize === wantedSize && variantColor === wantedColor;
}) || null

);
}

function getVariantStock(product, size, color) {
if (product?.sizes?.length && product?.colors?.length) {
const variant = findVariant(product, size, color);
return Math.max(0, Number(variant?.stock || 0));
}

if (product?.sizes?.length) {
const wantedSize = normalizeName(size);

const variant = product?.variants?.find(
  (item) =>
    normalizeName(item.size?.name || item.sizeName || "") === wantedSize
);

return Math.max(0, Number(variant?.stock || 0));

}

if (product?.colors?.length) {
const wantedColor = normalizeName(color);

const variant = product?.variants?.find(
  (item) =>
    normalizeName(item.color?.name || item.colorName || "") === wantedColor
);

return Math.max(0, Number(variant?.stock || 0));

}

return Math.max(0, Number(product?.stock || 0));
}

function findScent(product, scentName) {
if (!product?.scents?.length || !scentName) {
return null;
}

const wanted = normalizeName(scentName);

return (
product.scents.find((item) => {
const name = getScentName(item.scent || item);
return normalizeName(name) === wanted;
}) || null
);
}

function getScentStock(product, scentName) {
if (!product?.scents?.length || !scentName) {
return null;
}

const scent = findScent(product, scentName);

return Math.max(0, Number(scent?.stock ?? 0));
}

function getAvailableQuantity(product, size, color, scent) {
const variantStock = getVariantStock(product, size, color);

if (product?.scents?.length) {
if (!scent) {
return 0;
}

const scentStock = getScentStock(product, scent);

if (scentStock === null) {
  return 0;
}

return Math.min(variantStock, scentStock);

}

return variantStock;
}

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

useEffect(() => {
if (!isLoggedIn) {
localStorage.setItem(GUEST_KEY, JSON.stringify(lines));
}
}, [lines, isLoggedIn]);

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

    if (active) {
      applyServerCart(data.cart);
    }
  } catch (error) {
    console.warn(
      "Could not load the cart:",
      error?.response?.data?.message || error.message
    );
  }
})();

return () => {
  active = false;
};

}, [isLoggedIn, user?.id, applyServerCart]);

const productById = useMemo(
() => new Map(products.map((product) => [product.id, product])),
[products]
);

const cartItems = useMemo(
() =>
lines
.map((line) => {
const product = productById.get(line.productId);

      if (!product) {
        return null;
      }

      const variantStock = getVariantStock(
        product,
        line.size,
        line.color
      );

      const scentStock = product.scents?.length
        ? getScentStock(product, line.scent)
        : null;

      const maxQuantity = Math.min(
        getAvailableQuantity(
          product,
          line.size,
          line.color,
          line.scent
        ),
        MAX_PER_LINE
      );

      const scentObj = findScent(product, line.scent);

      const colorObj =
        product.colors?.find(
          (color) =>
            normalizeName(getColorName(color)) ===
            normalizeName(line.color)
        ) || null;

      const available = maxQuantity > 0;

      return {
        key: `${line.productId}|${line.size}|${line.color}|${line.scent}`,
        cartItemId: line.cartItemId,
        productId: line.productId,
        product,
        size: line.size,
        color: line.color,
        scent: line.scent,
        scentObj,
        colorObj,
        quantity: line.quantity,
        maxQuantity,
        available,

        variantStock,
        scentStock,
      };
    })
    .filter(Boolean),
[lines, productById]

);

const totalItems = useMemo(
() => cartItems.reduce((sum, item) => sum + item.quantity, 0),
[cartItems]
);

const totalPrice = useMemo(
() =>
cartItems.reduce(
(sum, item) =>
sum + Math.round(item.product.price * 100) * item.quantity,
0
) / 100,
[cartItems]
);

const errorResult = (error) => ({
ok: false,
error,
message: error?.response?.data?.message || "",
});

const addToCart = useCallback(
async (
product,
{ size = "", color = "", scent = "", quantity = 1 } = {}
) => {
const qty = Math.max(1, Math.floor(Number(quantity) || 1));

  if (product.sizes?.length && !size) {
    return {
      ok: false,
      message: "Please select a size",
    };
  }

  if (product.colors?.length && !color) {
    return {
      ok: false,
      message: "Please select a color",
    };
  }

  if (product.scents?.length && !scent) {
    return {
      ok: false,
      message: "Please select a scent",
    };
  }

  const availableQuantity = getAvailableQuantity(
    product,
    size,
    color,
    scent
  );

  if (availableQuantity < 1) {
    return {
      ok: false,
      message: "This selection is out of stock",
    };
  }

  if (isLoggedIn) {
    try {
      const { data } = await api.post("/cart", {
        productId: product.id,
        quantity: qty,
        size,
        color,
        scent,
      });

      applyServerCart(data.cart);

      return { ok: true };
    } catch (error) {
      return errorResult(error);
    }
  }

  const limit = Math.min(availableQuantity, MAX_PER_LINE);

  const existing = lines.find(
    (line) =>
      line.productId === product.id &&
      line.size === size &&
      line.color === color &&
      line.scent === scent
  );

  if ((existing?.quantity || 0) + qty > limit) {
    return {
      ok: false,
      message: `Only ${limit} available in stock for this selection`,
    };
  }

  setLines((prev) =>
    existing
      ? prev.map((line) =>
          line === existing
            ? {
                ...line,
                quantity: line.quantity + qty,
              }
            : line
        )
      : [
          ...prev,
          {
            productId: product.id,
            size,
            color,
            scent,
            quantity: qty,
          },
        ]
  );

  return { ok: true };
},
[isLoggedIn, lines, applyServerCart]

);

const updateQuantity = useCallback(
async (item, quantity) => {
const maxQuantity = Math.min(
Number(item.maxQuantity || 0),
MAX_PER_LINE
);

  if (maxQuantity < 1) {
    return {
      ok: false,
      message: "This selection is out of stock",
    };
  }

  const qty = Math.max(
    1,
    Math.min(
      Math.floor(Number(quantity) || 1),
      maxQuantity
    )
  );

  if (isLoggedIn) {
    try {
      const { data } = await api.put(
        `/cart/items/${item.cartItemId}`,
        { quantity: qty }
      );

      applyServerCart(data.cart);

      return { ok: true };
    } catch (error) {
      return errorResult(error);
    }
  }

  setLines((prev) =>
    prev.map((line) =>
      line.productId === item.productId &&
      line.size === item.size &&
      line.color === item.color &&
      line.scent === item.scent
        ? {
            ...line,
            quantity: qty,
          }
        : line
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
const { data } = await api.delete(
`/cart/items/${item.cartItemId}`
);

      applyServerCart(data.cart);

      return { ok: true };
    } catch (error) {
      return errorResult(error);
    }
  }

  setLines((prev) =>
    prev.filter(
      (line) =>
        !(
          line.productId === item.productId &&
          line.size === item.size &&
          line.color === item.color &&
          line.scent === item.scent
        )
    )
  );

  return { ok: true };
},
[isLoggedIn, applyServerCart]

);

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

const refreshCart = useCallback(async () => {
if (!isLoggedIn) {
return;
}

try {
  const { data } = await api.get("/cart");
  applyServerCart(data.cart);
} catch {
  /* keep what we have */
}

}, [isLoggedIn, applyServerCart]);

const value = useMemo(
() => ({
cartItems,
totalItems,
totalPrice,
addToCart,
updateQuantity,
removeFromCart,
clearCart,
refreshCart,
}),
[
cartItems,
totalItems,
totalPrice,
addToCart,
updateQuantity,
removeFromCart,
clearCart,
refreshCart,
]
);

return (
<CartContext.Provider value={value}>
{children}
</CartContext.Provider>
);
}

export function useCart() {
return useContext(CartContext);
}