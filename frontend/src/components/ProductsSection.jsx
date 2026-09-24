import ProductCard from "./ProductCard";

function ProductsSection({ eyebrow, title, products }) {
  if (!products.length) return null;

  return (
    <section className="products-section">
      <div className="section-heading">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>

      <div className="products-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export default ProductsSection;
