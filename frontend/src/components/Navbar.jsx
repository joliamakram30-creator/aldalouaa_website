
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Heart,
  ShoppingBag,
  User,
  Menu,
  X,
} from "lucide-react";

import logo from "../assets/images/logo.jpg";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useStore } from "../context/StoreContext";

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { totalItems } = useCart();
  const { favorites } = useFavorites();
  const { user, logout, isLoggedIn, isAdmin } = useAuth();
  const { config } = useStore();

  const navigate = useNavigate();
  const { t, toggleLanguage, isArabic, pick } = useLanguage();

  function handleSearchSubmit(e) {
    e.preventDefault();

    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchOpen(false);
      setSearchTerm("");
    }
  }

  function handleLogout() {
    logout();
    setUserMenuOpen(false);
    navigate("/");
  }

  return (
    <>
      {/* Announcement */}
      {config.freeShippingEnabled && config.freeShippingThreshold > 0 && (
        <div className="announcement-bar">
          {pick(
            `Free shipping on orders over ${config.freeShippingThreshold} EGP`,
            `شحن مجاني للطلبات فوق ${config.freeShippingThreshold} جنيه`
          )}
        </div>
      )}

      {/* Navbar */}
      <header className="navbar">
        <div className="navbar-inner">

          {/* Mobile Menu */}
          <button
            className="mobile-menu"
            onClick={() => setMobileOpen(true)}
            aria-label={isArabic ? "فتح القائمة" : "Open menu"}
          >
            <Menu size={22} />
          </button>

          {/* Logo */}
          <Link to="/" className="logo">
            <div className="logo-badge">
              <img src={logo} alt="Al Dalouaa" />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="nav-links">
            <Link to="/">{t("home")}</Link>
            <Link to="/shop">{t("shop")}</Link>
            <Link to="/categories">{t("categories")}</Link>
            <Link to="/new-arrivals">{t("arrivals")}</Link>
            <Link to="/about">{t("about")}</Link>
          </nav>

          {/* Actions */}
          <div className="nav-actions">

            {/* Search */}
            <button
              className="nav-action-button"
              aria-label={isArabic ? "بحث" : "Search"}
              onClick={() => setSearchOpen((prev) => !prev)}
            >
              <Search size={21} />
            </button>

            {/* FAVORITES */}
            <Link
              to="/favorites"
              className="icon-link favorites-link"
              aria-label={isArabic ? "المفضلة" : "Wishlist"}
              title={isArabic ? "المفضلة" : "Wishlist"}
            >
              <Heart size={21} />

              {favorites?.length > 0 && (
                <span className="mini-badge">
                  {favorites.length}
                </span>
              )}
            </Link>

            {/* User */}
            <div className="user-menu-wrapper">
              <button
                className="nav-action-button"
                aria-label={isArabic ? "الحساب" : "Account"}
                onClick={() => setUserMenuOpen((prev) => !prev)}
              >
                <User size={21} />
              </button>

              {userMenuOpen && (
                <div className="user-dropdown">

                  {isLoggedIn ? (
                    <>
                      <span className="dropdown-greeting">
                        {isArabic ? "أهلًا، " : "Hi, "}
                        {user?.name || (isArabic ? "بيكي" : "there")}
                      </span>

                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {t("profile")}
                      </Link>

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          {pick("Admin Panel", "لوحة التحكم")}
                        </Link>
                      )}

                      <Link
                        to="/favorites"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {t("favorites")}
                      </Link>

                      <Link
                        to="/cart"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {t("cart")}
                      </Link>

                      <Link
                        to="/about"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {t("about")}
                      </Link>

                      <button
                        className="dropdown-logout"
                        onClick={handleLogout}
                      >
                        {t("logout")}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {t("login")}
                      </Link>

                      <Link
                        to="/register"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {t("createAccount")}
                      </Link>

                      <Link
                        to="/about"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {t("about")}
                      </Link>
                    </>
                  )}

                </div>
              )}
            </div>

            {/* Language */}
            <button
              className="language-toggle"
              onClick={toggleLanguage}
              aria-label={
                isArabic
                  ? "Switch to English"
                  : "التبديل للعربية"
              }
              title={t("language")}
            >
              {t("language")}
            </button>

            {/* CART */}
            <Link
              to="/cart"
              className="cart-button"
              aria-label={t("cart")}
              title={t("cart")}
            >
              <ShoppingBag size={21} />

              <span className="cart-count">
                {totalItems}
              </span>
            </Link>

          </div>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <form
            className="search-bar"
            onSubmit={handleSearchSubmit}
          >
            <Search size={18} />

            <input
              type="text"
              placeholder={t("search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />

            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              aria-label={isArabic ? "إغلاق البحث" : "Close search"}
            >
              <X size={18} />
            </button>
          </form>
        )}
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
          >

            <button
              className="drawer-close"
              onClick={() => setMobileOpen(false)}
              aria-label={
                isArabic
                  ? "إغلاق القائمة"
                  : "Close menu"
              }
            >
              <X size={22} />
            </button>

            <nav className="drawer-links">

              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
              >
                {t("home")}
              </Link>

              <Link
                to="/shop"
                onClick={() => setMobileOpen(false)}
              >
                {t("shop")}
              </Link>

              <Link
                to="/categories"
                onClick={() => setMobileOpen(false)}
              >
                {t("categories")}
              </Link>

              <Link
                to="/new-arrivals"
                onClick={() => setMobileOpen(false)}
              >
                {t("arrivals")}
              </Link>

              {/* Favorites */}
              <Link
                to="/favorites"
                onClick={() => setMobileOpen(false)}
              >
                {t("favorites")}
              </Link>

              {/* Cart */}
              <Link
                to="/cart"
                onClick={() => setMobileOpen(false)}
              >
                {t("cart")}
              </Link>

              <div className="drawer-divider" />

              {isLoggedIn ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("profile")}
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                    >
                      {pick("Admin Panel", "لوحة التحكم")}
                    </Link>
                  )}

                  <Link
                    to="/about"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("about")}
                  </Link>

                  <button
                    className="drawer-logout"
                    onClick={() => {
                      handleLogout();
                      setMobileOpen(false);
                    }}
                  >
                    {t("logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("login")}
                  </Link>

                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("createAccount")}
                  </Link>

                  <Link
                    to="/about"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("about")}
                  </Link>
                </>
              )}

            </nav>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;

