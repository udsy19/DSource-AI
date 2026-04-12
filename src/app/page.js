import Banner from "../components/landing-page/banner";
import Hero from "../components/landing-page/hero";
import PopularProducts from "../components/landing-page/popular-products";
import ModernMinimalist from "../components/landing-page/modern-minimalist";
import MadeWithDsource from "../components/landing-page/made-with-dsource";

export default function Home() {
  return (
    <div>
      <Banner />
      <div>
        <Hero />
      </div>
      <div>
        <PopularProducts />
      </div>
      <div>
        <ModernMinimalist />
      </div>
      <div>
        <MadeWithDsource />
      </div>
    </div>
  );
}
