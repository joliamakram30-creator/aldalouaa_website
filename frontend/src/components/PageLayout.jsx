import Navbar from "./Navbar";
import Footer from "./Footer";

// Standard page frame: announcement bar + navbar, page content, footer.
function PageLayout({ children }) {
  return (
    <div className="app">
      <Navbar />
      {children}
      <Footer />
    </div>
  );
}

export default PageLayout;
