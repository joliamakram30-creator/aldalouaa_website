
/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { assetUrl } from "../services/api";
import { sortSizes } from "../utils/format";

const StoreContext = createContext(null);

// Turns an API product into the shape the storefront components use.
export function normalizeProduct(product) {
  const images = (product.images?.length
    ? product.images.map((image) => image.url)
    : product.image
    ? [product.image]
    : []
  ).map(assetUrl);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    nameAr: product.nameAr || "",
    description: product.description || "",
    descriptionAr: product.descriptionAr || "",
    price: Number(product.price),
    oldPrice: product.oldPrice ? Number(product.oldPrice) : null,
    stock: Number(product.stock) || 0,
    isFeatured: Boolean(product.isFeatured),
    createdAt: product.createdAt,

    category: product.category
      ? {
          id: product.category.id,
          name: product.category.name,
          nameAr: product.category.nameAr || "",
          slug: product.category.slug,
        }
      : null,

    images,
    img: images[0] || "",

    sizes: sortSizes(
      (product.sizes || [])
        .map((entry) => entry.size?.name)
        .filter(Boolean)
    ),

    colors: (product.colors || [])
      .map((entry) => ({
        name: entry.color?.name,
        nameAr: entry.color?.nameAr || "",
        hex: entry.color?.hexCode || "#d94f70",
      }))
      .filter((color) => color.name),

    // Product scents
    scents: (product.scents || [])
      .map((entry) => ({
        id: entry.scent?.id,
        name: entry.scent?.name,
        nameAr: entry.scent?.nameAr || "",
      }))
      .filter((scent) => scent.name),
  };
}

export function normalizeCategory(category) {
  return {
    id: category.id,
    name: category.name,
    nameAr: category.nameAr || "",
    slug: category.slug,
    img: assetUrl(category.image),
    productCount: category._count?.products ?? 0,
  };
}

export function StoreProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [config, setConfig] = useState({
    zones: [],
    freeShippingThreshold: 0,
    freeShippingEnabled: false,
    vodafoneCashNumber: "",
    googleClientId: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [productsRes, categoriesRes, configRes] = await Promise.all([
        api.get("/products"),
        api.get("/categories"),
        api.get("/store/config"),
      ]);

      setProducts(
        (productsRes.data.products || []).map(normalizeProduct)
      );

      setCategories(
        (categoriesRes.data.categories || []).map(normalizeCategory)
      );

      setConfig({
        zones: (configRes.data.shipping?.zones || []).map((zone) => ({
          ...zone,
          price: Number(zone.price),
        })),
        freeShippingThreshold:
          Number(configRes.data.shipping?.freeShippingThreshold) || 0,
        freeShippingEnabled: Boolean(configRes.data.shipping?.freeShippingEnabled),
        vodafoneCashNumber:
          configRes.data.payment?.vodafoneCashNumber || "",
        googleClientId:
          configRes.data.auth?.googleClientId || "",
      });

      setError(false);
    } catch (err) {
      console.warn("Could not load the store:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({
      products,
      categories,
      config,
      loading,
      error,
      reload,
    }),
    [products, categories, config, loading, error, reload]
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}

