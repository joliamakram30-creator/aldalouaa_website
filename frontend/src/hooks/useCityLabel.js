import { useCallback } from "react";
import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";

// Orders keep the governorate name as it was when the order was placed (Arabic).
// This shows it in the language the visitor picked when the governorate still exists.
export function useCityLabel() {
  const { config } = useStore();
  const { zoneName } = useLanguage();

  return useCallback(
    (city) => {
      const zone = config.zones.find((z) => z.nameAr === city);
      return zone ? zoneName(zone) : city;
    },
    [config.zones, zoneName]
  );
}
