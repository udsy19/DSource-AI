import Reveal from "@/components/Reveal";

const SAMPLE_CATEGORIES = [
  {
    id: 1,
    label: "Wallpaper",
    image: "/api/images/sample-category/sample-1.webp",
  },
  {
    id: 2,
    label: "Countertops & stone",
    image: "/api/images/sample-category/sample-2.avif",
  },
  {
    id: 3,
    label: "Tiles",
    image: "/api/images/sample-category/sample-3.webp",
  },
  {
    id: 4,
    label: "Flooring paint",
    image: "/api/images/sample-category/sample-4.avif",
  },
  {
    id: 5,
    label: "Fabric & leather",
    image: "/api/images/sample-category/sample-5.jpg",
  },
  {
    id: 6,
    label: "Paneling",
    image: "/api/images/sample-category/sample-6.webp",
  },
  {
    id: 7,
    label: "Faucets & fixtures",
    image: "/api/images/sample-category/sample-7.jpg",
  },
  {
    id: 8,
    label: "Cabinets",
    image: "/api/images/sample-category/sample-8.webp",
  },
  {
    id: 9,
    label: "Deckings & railings",
    image: "/api/images/sample-category/sample-9.jpg",
  },
  {
    id: 10,
    label: "Area rugs",
    image: "/api/images/sample-category/sample-10.webp",
  },
];

const SHOP_BY_ROOM = [
  {
    id: 1,
    label: "Living room",
    image: "/api/images/shop-by-room/shop-by-room-1.avif",
  },
  {
    id: 2,
    label: "Bedroom",
    image: "/api/images/shop-by-room/shop-by-room-2.avif",
  },
  {
    id: 3,
    label: "Kitchen",
    image: "/api/images/shop-by-room/shop-by-room-3.jpg",
  },
  {
    id: 4,
    label: "Dining room",
    image: "/api/images/shop-by-room/shop-by-room-4.jpg",
  },
  {
    id: 5,
    label: "Bathroom",
    image: "/api/images/shop-by-room/shop-by-room-1.avif",
  },
  {
    id: 6,
    label: "Outdoor",
    image: "/api/images/shop-by-room/shop-by-room-2.avif",
  },
  {
    id: 7,
    label: "Prayer",
    image: "/api/images/shop-by-room/shop-by-room-3.jpg",
  },
  {
    id: 8,
    label: "Office",
    image: "/api/images/shop-by-room/shop-by-room-4.jpg",
  },
];

const SHOP_THE_LOOK = [
  { id: 1, image: "/api/images/shop-the-look/shop-the-look-1.jpg" },
  { id: 2, image: "/api/images/shop-the-look/shop-the-look-2.jpg" },
  { id: 3, image: "/api/images/shop-the-look/shop-the-look-3.avif" },
  { id: 4, image: "/api/images/shop-the-look/shop-the-look-4.avif" },
  { id: 5, image: "/api/images/shop-the-look/shop-the-look-5.jpg" },
  { id: 6, image: "/api/images/shop-the-look/shop-the-look-6.avif" },
];

/* A sample plate: image on paper, hairline border, lift on hover by shadow only. */
const SamplePlate = ({ image, label }) => (
  <div className="group">
    <div
      className="aspect-square w-full overflow-hidden rounded-lg border border-[var(--viz-line)] bg-[var(--viz-paper)] transition-shadow duration-300 group-hover:shadow-[0_16px_32px_-20px_rgba(38,34,26,0.5)]"
      style={{
        backgroundImage: `url(${image})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      role="img"
      aria-label={label || "Styled interior look"}
    />
    {label && <p className="viz-serif mt-2 text-sm sm:text-base">{label}</p>}
  </div>
);

const Marketplace = () => {
  return (
    <div className="viz-scope min-h-screen w-full">
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-16 sm:px-8 sm:pt-32 md:pb-24">
        {/* Folio masthead */}
        <Reveal>
          <div className="flex items-baseline justify-between gap-4 pb-2">
            <p className="viz-label">Marketplace</p>
            <p className="viz-label hidden sm:block">
              Materials · Rooms · Looks
            </p>
          </div>
          <div className="relative pt-5">
            <span
              className="viz-rule absolute top-0 left-0 h-0.5 w-full bg-[var(--viz-ink)]"
              aria-hidden="true"
            />
            <span className="viz-dots-rule" aria-hidden="true" />
            <h1 className="viz-serif text-4xl leading-none sm:text-5xl">
              The sample library
            </h1>
            <p className="viz-serif mt-4 max-w-2xl text-lg italic text-[var(--viz-muted)] sm:text-xl">
              Materials, rooms, and finished looks — every sample here can go
              straight into your next render.
            </p>
          </div>
        </Reveal>

        {/* Sample categories */}
        <Reveal className="mt-14 sm:mt-20">
          <div className="flex items-baseline justify-between border-t border-[var(--viz-line)] pt-2">
            <p className="viz-label">Sample categories</p>
            <p className="viz-label">
              {String(SAMPLE_CATEGORIES.length).padStart(2, "0")}
            </p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-5">
            {SAMPLE_CATEGORIES.map((item) => (
              <SamplePlate
                key={item.id}
                image={item.image}
                label={item.label}
              />
            ))}
          </div>
        </Reveal>

        {/* Shop by room */}
        <Reveal className="mt-14 sm:mt-20">
          <div className="flex items-baseline justify-between border-t border-[var(--viz-line)] pt-2">
            <p className="viz-label">Shop by room</p>
            <p className="viz-label">
              {String(SHOP_BY_ROOM.length).padStart(2, "0")}
            </p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {SHOP_BY_ROOM.map((item) => (
              <SamplePlate
                key={item.id}
                image={item.image}
                label={item.label}
              />
            ))}
          </div>
        </Reveal>

        {/* Shop the look */}
        <Reveal className="mt-14 sm:mt-20">
          <div className="flex items-baseline justify-between border-t border-[var(--viz-line)] pt-2">
            <p className="viz-label">Shop the look</p>
            <p className="viz-label">
              {String(SHOP_THE_LOOK.length).padStart(2, "0")}
            </p>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
            {SHOP_THE_LOOK.map((item) => (
              <SamplePlate key={item.id} image={item.image} />
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default Marketplace;
