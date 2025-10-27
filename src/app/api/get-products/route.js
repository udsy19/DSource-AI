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
                title: "Wall Painting 1",
                image: "/api/images/wall-painting/wall-painting-1.png",
                link: "/marketplace",
              },
              {
                title: "Wall Painting 2",
                image: "/api/images/wall-painting/wall-painting-2.png",
                link: "/marketplace",
              },
              {
                title: "Wall Painting 3",
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
                title: "Pillow 1",
                image: "/api/images/pillow/pillow-1.avif",
                link: "/marketplace",
              },
              {
                title: "Pillow 2",
                image: "/api/images/pillow/pillow-2.avif",
                link: "/marketplace",
              },
              {
                title: "Pillow 3",
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
                title: "Sofa 1",
                image: "/api/images/sofa/sofa-1.avif",
                link: "/marketplace",
              },
              {
                title: "Sofa 2",
                image: "/api/images/sofa/sofa-2.avif",
                link: "/marketplace",
              },
              {
                title: "Sofa 3",
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
                title: "Coffee Table 1",
                image: "/api/images/coffee-table/coffee-table-1.webp",
                link: "/marketplace",
              },
              {
                title: "Coffee Table 2",
                image: "/api/images/coffee-table/coffee-table-2.webp",
                link: "/marketplace",
              },
              {
                title: "Coffee Table 3",
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
                title: "Floor 1",
                image: "/api/images/floor/floor-1.webp",
                link: "/marketplace",
              },
              {
                title: "Floor 2",
                image: "/api/images/floor/floor-2.webp",
                link: "/marketplace",
              },
              {
                title: "Floor 3",
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
                title: "Carpet 1",
                image: "/api/images/carpet/carpet-1.avif",
                link: "/marketplace",
              },
              {
                title: "Carpet 2",
                image: "/api/images/carpet/carpet-2.avif",
                link: "/marketplace",
              },
              {
                title: "Carpet 3",
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
