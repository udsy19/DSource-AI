import CollectionParallax from "../components/landing-page/CollectionParallax";
import GalleryWall from "../components/landing-page/GalleryWall";
import MaterialFan from "../components/landing-page/MaterialFan";
import VideoScrollHero from "../components/landing-page/VideoScrollHero";
import WorkflowPlates from "../components/landing-page/WorkflowPlates";

export default function Home() {
  return (
    <div>
      <VideoScrollHero />
      <WorkflowPlates />
      <MaterialFan />
      <CollectionParallax />
      <GalleryWall />
    </div>
  );
}
