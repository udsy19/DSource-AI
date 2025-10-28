import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    return NextResponse.json(
      {
        categories: [
          {
            id: 1,
            label: "Wall Painting",
            products: [
              {
                title: "Beige plush Texture Paint",
                brand: "Itai",
                color: "Sand",
                image: "/api/images/wall-painting/wall-painting-1.png",
                link: "/marketplace",
              },
              {
                title: "Glidden Toasted Almond Paint",
                brand: "Casa",
                color: "Light Brown",
                image: "/api/images/wall-painting/wall-painting-2.png",
                link: "/marketplace",
              },
              {
                title: "Kar Balanced Beige Paint",
                brand: "Sheril",
                color: "Soft Beige",
                image: "/api/images/wall-painting/wall-painting-3.png",
                link: "/marketplace",
              },
            ],
          },
          {
            id: 2,
            label: "Pillow",
            products: [
              {
                title: "CloudNest Cushion",
                brand: "Lumea Home",
                color: "Misty Pearl",
                image: "/api/images/pillow/pillow-1.avif",
                link: "/marketplace",
              },
              {
                title: "DriftWeave Pillow",
                brand: "Solvo Studio",
                color: "Deep Dune",
                image: "/api/images/pillow/pillow-2.avif",
                link: "/marketplace",
              },
              {
                title: "HushHaven Pillow",
                brand: "Havenora",
                color: "Sea Green",
                image: "/api/images/pillow/pillow-3.avif",
                link: "/marketplace",
              },
            ],
          },
          {
            id: 3,
            label: "Sofa",
            products: [
              {
                title: "Verona Luxe Sofa",
                brand: "Auralis Interiors",
                color: "Clay Smoke",
                image: "/api/images/sofa/sofa-1.avif",
                link: "/marketplace",
              },
              {
                title: "Seraphine Couch",
                brand: "Modhavn",
                color: "Chacoal Bloom",
                image: "/api/images/sofa/sofa-2.avif",
                link: "/marketplace",
              },
              {
                title: "Calista Sectional",
                brand: "Omera Studio",
                color: "Warm Truffle",
                image: "/api/images/sofa/sofa-3.avif",
                link: "/marketplace",
              },
            ],
          },
          {
            id: 4,
            label: "Coffee Table",
            products: [
              {
                title: "Elmora Table",
                brand: "HavenCraft",
                color: "Smoker Maple",
                image: "/api/images/coffee-table/coffee-table-1.webp",
                link: "/marketplace",
              },
              {
                title: "MarrowOak Table",
                brand: "Elaron Home",
                color: "Rustic Chestnut",
                image: "/api/images/coffee-table/coffee-table-2.webp",
                link: "/marketplace",
              },
              {
                title: "Solara Centerpiece",
                brand: "UrbanLoom",
                color: "Amber Teak",
                image: "/api/images/coffee-table/coffee-table-3.jpg",
                link: "/marketplace",
              },
            ],
          },
          {
            id: 5,
            label: "Floor",
            products: [
              {
                title: "OakLume Flooring",
                brand: "NaturaCore",
                color: "Amber Ash",
                image: "/api/images/floor/floor-1.webp",
                link: "/marketplace",
              },
              {
                title: "Solterra Plank",
                brand: "EarthEdge",
                color: "Driftwood Brown",
                image: "/api/images/floor/floor-2.webp",
                link: "/marketplace",
              },
              {
                title: "GrainSync Vinyl",
                brand: "Axio Floors",
                color: "Coastal Oak",
                image: "/api/images/floor/floor-3.webp",
                link: "/marketplace",
              },
            ],
          },
          {
            id: 6,
            label: "Carpet",
            products: [
              {
                title: "TerraWool Rug",
                brand: "LoomCraft",
                color: "Desert Honey",
                image: "/api/images/carpet/carpet-1.avif",
                link: "/marketplace",
              },
              {
                title: "SilkThread Carpet",
                brand: "Elanora",
                color: "Pebble Cloud Brown",
                image: "/api/images/carpet/carpet-2.avif",
                link: "/marketplace",
              },
              {
                title: "HavenMat",
                brand: "Arvyn Home",
                color: "Dusk Beige",
                image: "/api/images/carpet/carpet-3.avif",
                link: "/marketplace",
              },
            ],
          },
        ],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to get products" },
      { status: 500 }
    );
  }
}
