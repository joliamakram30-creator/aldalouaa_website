
import { useNavigate } from "react-router-dom";
import PageLayout from "../components/PageLayout";
import { useLanguage } from "../context/LanguageContext";
function About(){const nav=useNavigate(); const {t}=useLanguage();return <PageLayout><main className="about-page"><section className="about-hero"><span>{t("aboutEyebrow")}</span><h1>{t("aboutTitle")}</h1><p>{t("aboutText")}</p><button className="btn btn-primary" onClick={()=>nav("/shop")}>{t("exploreCollection")}</button></section><section className="about-values"><div><b>01</b><h3>{t("feminine")}</h3><p>{t("feminineText")}</p></div><div><b>02</b><h3>{t("curatedValue")}</h3><p>{t("curatedText")}</p></div><div><b>03</b><h3>{t("forYou")}</h3><p>{t("forYouText")}</p></div></section></main></PageLayout>}
export default About;
