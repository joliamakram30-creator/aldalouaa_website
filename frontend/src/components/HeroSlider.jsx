import { useState, useEffect } from "react";
import hero1 from "../assets/images/0d78b9206f02ae1766be15052d7648d0.jpg";
import hero2 from "../assets/images/a7192f0123a34e858d48280f5337e0e6.jpg";
import hero3 from "../assets/images/d88594197497eb06936b988d40056703.jpg";
import { useLanguage } from "../context/LanguageContext";

const slides = [
  { label: ["MAKEUP EDIT", "مجموعة الميكب"], title: ["Beauty starts here", "الجمال بيبدأ من هنا"], img: hero1 },
  { label: ["PAJAMAS EDIT", "مجموعة البيجامات"], title: ["Comfort, styled", "راحة بستايل"], img: hero2 },
  { label: ["LINGERIE EDIT", "مجموعة اللانجيري"], title: ["Elegance in every detail", "أناقة في كل تفصيلة"], img: hero3 },
];

function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const { pick } = useLanguage();

  useEffect(() => {
    const timer = setInterval(() => setCurrent((x) => (x + 1) % slides.length), 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hero-visual">
      {slides.map((slide, i) => (
        <div key={i} className={`hero-slide ${i === current ? "active" : ""}`}>
          <img src={slide.img} alt={pick(slide.title[0], slide.title[1])} />
        </div>
      ))}
      <div className="hero-card">
        <span>{pick(slides[current].label[0], slides[current].label[1])}</span>
        <strong>{pick(slides[current].title[0], slides[current].title[1])}</strong>
      </div>
      <div className="hero-dots">
        {slides.map((_, i) => (
          <button key={i} className={i === current ? "active" : ""} onClick={() => setCurrent(i)} aria-label={`Slide ${i + 1}`} />
        ))}
      </div>
    </div>
  );
}

export default HeroSlider;
