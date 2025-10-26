import Image from "next/image";

import Hero from "../components/landing-page/hero";
import PopularProducts from "../components/landing-page/popular-products";
import ModernMinimalist from "../components/landing-page/modern-minimalist";
import MadeWithDsource from "../components/landing-page/made-with-dsource";

import bannerImage from "../../public/banner-image.jpg";

export default function Home() {
  return (
    <div>
      <div className="w-full h-[80vh]" id="banner-image"></div>
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
