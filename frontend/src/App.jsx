import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { CartProvider } from "./context/CartContext";
import { StoreProvider } from "./context/StoreContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ScrollToTop from "./components/ScrollToTop";
import { LanguageProvider } from "./context/LanguageContext";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProductDetails from "./pages/ProductDetails";
import Favorites from "./pages/Favorites";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Profile from "./pages/Profile";
import About from "./pages/About";
import SearchResults from "./pages/SearchResults";
import Shop from "./pages/Shop";
import CategoriesPage from "./pages/CategoriesPage";
import NewArrivals from "./pages/NewArrivals";
import NotFound from "./pages/NotFound";

// Admin
import AdminLayout from "./admin/AdminLayout";
import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminProducts from "./admin/pages/AdminProducts";
import AdminOptions from "./admin/pages/AdminOptions";
import AdminOrders from "./admin/pages/AdminOrders";
import AdminUsers from "./admin/pages/AdminUsers";
import AdminCategories from "./admin/pages/AdminCategories";
import AdminShipping from "./admin/pages/AdminShipping";

import "./App.css";

function App() {
  return (
    <ErrorBoundary>
    <LanguageProvider>
      <AuthProvider>
        <StoreProvider>
        <FavoritesProvider>
        <CartProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>

              {/* =========================
                  CUSTOMER WEBSITE
              ========================= */}

              <Route path="/" element={<Home />} />

              <Route path="/login" element={<Login />} />

              <Route path="/register" element={<Register />} />

              <Route
                path="/product/:id"
                element={<ProductDetails />}
              />

              <Route
                path="/favorites"
                element={<Favorites />}
              />

              <Route
                path="/cart"
                element={<Cart />}
              />

              <Route
                path="/checkout"
                element={<Checkout />}
              />

              <Route
                path="/profile"
                element={<Profile />}
              />

              <Route
                path="/about"
                element={<About />}
              />

              <Route
                path="/search"
                element={<SearchResults />}
              />

              <Route
                path="/shop"
                element={<Shop />}
              />

              <Route
                path="/categories"
                element={<CategoriesPage />}
              />

              <Route
                path="/new-arrivals"
                element={<NewArrivals />}
              />

              {/* =========================
                  ADMIN PANEL
              ========================= */}

              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />

                <Route
                  path="products"
                  element={<AdminProducts />}
                />

                <Route
                  path="options"
                  element={<AdminOptions />}
                />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="shipping" element={<AdminShipping />} />
              </Route>

              {/* =========================
                  404
              ========================= */}

              <Route
                path="*"
                element={<NotFound />}
              />

            </Routes>
          </BrowserRouter>
        </CartProvider>
        </FavoritesProvider>
        </StoreProvider>
      </AuthProvider>
    </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;