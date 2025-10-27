import React from "react";

const Marketplace = () => {
  const sampleCategory = [
    {
      id: 1,
      label: "Wallpaper",
      image: "/api/images/sample-category/sample-1.webp",
    },
    {
      id: 2,
      label: "Countertops & Stone",
      image: "/api/images/sample-category/sample-2.avif",
    },
    {
      id: 3,
      label: "Tiles",
      image: "/api/images/sample-category/sample-3.webp",
    },
    {
      id: 4,
      label: "Flooring Paint",
      image: "/api/images/sample-category/sample-4.avif",
    },
    {
      id: 5,
      label: "Fabric & Leather",
      image: "/api/images/sample-category/sample-5.jpg",
    },
    {
      id: 6,
      label: "Paneling",
      image: "/api/images/sample-category/sample-6.webp",
    },
    {
      id: 7,
      label: "Faucets & Fixtures",
      image: "/api/images/sample-category/sample-7.jpg",
    },
    {
      id: 8,
      label: "Cabinets",
      image: "/api/images/sample-category/sample-8.webp",
    },
    {
      id: 9,
      label: "Deckings & Railings",
      image: "/api/images/sample-category/sample-9.jpg",
    },
    {
      id: 10,
      label: "Area Rugs",
      image: "/api/images/sample-category/sample-10.webp",
    },
  ];

  const shopByRoom = [
    {
      id: 1,
      label: "Living Room",
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
      label: "Dining Room",
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

  const shopTheLook = [
    {
      id: 1,
      image: "/api/images/shop-the-look/shop-the-look-1.jpg",
    },
    {
      id: 2,
      image: "/api/images/shop-the-look/shop-the-look-2.jpg",
    },
    {
      id: 3,
      image: "/api/images/shop-the-look/shop-the-look-3.avif",
    },
    {
      id: 4,
      image: "/api/images/shop-the-look/shop-the-look-4.avif",
    },
    {
      id: 5,
      image: "/api/images/shop-the-look/shop-the-look-5.jpg",
    },
    {
      id: 6,
      image: "/api/images/shop-the-look/shop-the-look-6.avif",
    },
  ];

  return (
    <div className="w-full h-full my-32 p-12">
      <div className="flex flex-col items-center justify-center mb-12">
        <h1 className="text-4xl font-bold">Marketplace</h1>
      </div>
      {/* Sample Category */}
      <h1 className="text-2xl font-bold text-center">Sample Category</h1>
      <div className="grid grid-cols-6 gap-12 px-12 mb-24 mt-12">
        {sampleCategory.map((item) => (
          <div
            className="flex flex-col items-center justify-center"
            key={item.id}
          >
            <div
              className="cursor-pointer col-span-1 w-full aspect-square rounded-lg shadow-md border border-white border-4 shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300"
              style={{
                backgroundImage: `url(${item.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>
            <h1 className="text-xl font-bold text-center mt-4">{item.label}</h1>
          </div>
        ))}
      </div>
      {/* Shop by room */}
      <h1 className="text-2xl font-bold text-center">Shop by room</h1>
      <div className="grid grid-cols-4 gap-12 px-24 mb-24 mt-12">
        {shopByRoom.map((item) => (
          <div
            className="flex flex-col items-center justify-center"
            key={item.id}
          >
            <div
              className="cursor-pointer col-span-1 w-full aspect-square rounded-lg shadow-md border border-white border-4 shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300"
              style={{
                backgroundImage: `url(${item.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>
            <h1 className="text-xl font-bold text-center mt-4">{item.label}</h1>
          </div>
        ))}
      </div>
      {/* Shop the look */}
      <h1 className="text-2xl font-bold text-center">Shop the look</h1>
      <div className="grid grid-cols-3 gap-12 px-24 mt-12">
        {shopTheLook.map((item) => (
          <div
            className="flex flex-col items-center justify-center"
            key={item.id}
          >
            <div
              className="cursor-pointer col-span-1 w-full aspect-square rounded-lg shadow-md shadow-black/40 hover:shadow-lg hover:shadow-black/60 transition-all duration-300"
              style={{
                backgroundImage: `url(${item.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Marketplace;
