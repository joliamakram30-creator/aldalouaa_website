import { useStore } from "../context/StoreContext";
import { useLanguage } from "../context/LanguageContext";

// Shows a loading / connection-error message instead of an empty page.
// Returns null when the store data is ready, so pages can do:
//   const state = <StoreState />  ... {state || content}
function StoreState() {
  const { loading, error, reload } = useStore();
  const { pick } = useLanguage();

  if (loading) {
    return (
      <div className="store-state">
        <div className="store-spinner" />
        <p>{pick("Loading...", "جاري التحميل...")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="store-state">
        <h2>{pick("We couldn't load the store", "مش قادرين نحمل المتجر")}</h2>
        <p>{pick("Please check your connection and try again.", "تأكدي من الاتصال بالإنترنت وجربي تاني.")}</p>
        <button className="btn btn-primary" onClick={reload}>
          {pick("Try again", "حاولي تاني")}
        </button>
      </div>
    );
  }

  return null;
}

export default StoreState;
