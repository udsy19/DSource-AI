import Image from "next/image";

import Header from "@/components/header";
import Hero from "@/components/hero";

import bannerImage from "../../public/banner-image.jpg";

export default function Home() {
  return (
    <div>
      <div className="w-full h-[80vh]" id="banner-image"></div>
      <div>
        <Hero />
      </div>
    </div>
  );
}
