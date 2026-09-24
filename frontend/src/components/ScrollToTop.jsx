import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// Start every new page at the top (not for query-string-only changes).
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

export default ScrollToTop;
