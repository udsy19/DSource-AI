"use client";
import React, { useState } from "react";
import Image from "next/image";

const SpecBuilder = () => {
  const [expandedCategories, setExpandedCategories] = useState({
    "Living Room Accessories": true,
    "Office Room": true,
  });
  const [productStatuses, setProductStatuses] = useState({
    SB003: "approved",
    TB005: "rejected",
    FS001: "draft",
    QT004: "approved",
  });

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const toggleStatus = (productId) => {
    setProductStatuses((prev) => {
      const statuses = ["approved", "rejected", "draft"];
      const currentIndex = statuses.indexOf(prev[productId] || "draft");
      const nextIndex = (currentIndex + 1) % statuses.length;
      return {
        ...prev,
        [productId]: statuses[nextIndex],
      };
    });
  };

  const categories = [
    {
      name: "Living Room Accessories",
      count: 4,
      products: [
        {
          id: "SB003",
          name: "Beige plush Texture paint",
          brand: "Italia",
          material: "Jute blent",
          finish: "Natural Low-sheen",
          dimensions: 'W: 8" H: 10"',
          color: "Sand",
          price: 520.0,
          quantity: 2,
          timeline: "1-2 weeks",
          inStock: true,
          image: "/wall-painting/wall-painting-1.png",
        },
        {
          id: "TB005",
          name: "Elmora Table",
          brand: "HavenCraft",
          material: "Solid ash wood",
          finish: "Smoked Maple Veneer",
          dimensions: 'W: 26" H: 42"',
          color: "Smoked Maple",
          price: 1249.0,
          quantity: 3,
          timeline: "2-4 weeks",
          inStock: true,
          image: "/coffee-table/coffee-table-1.webp",
        },
        {
          id: "FS001",
          name: "Seraphine Couch",
          brand: "Modhavan",
          material: "Premium linen fabric",
          finish: "Upholstered gray",
          dimensions: 'W: 36" H: 32"',
          color: "Clay gray",
          price: 1250.0,
          quantity: 1,
          timeline: "2-4 weeks",
          inStock: true,
          image: "/sofa/sofa-2.avif",
        },
        {
          id: "QT004",
          name: "Solterra Plank",
          brand: "EarhEdge",
          material: "ok wood plank",
          finish: "Ash satin finish",
          dimensions: 'W: 48" H: 0.5"',
          color: "Drift wood Brown",
          price: 6.25,
          quantity: 400,
          timeline: "3-4 weeks",
          inStock: true,
          image: "/floor/floor-2.webp",
        },
      ],
    },
    {
      name: "Office Room",
      count: 3,
      products: [
        {
          id: "FB001",
          name: "OakLume Flooring",
          brand: "NatureCore",
          material: "Oak Hardwood",
          finish: "Semi Matte",
          dimensions: 'W: 21" H: 8"',
          color: "Amber Ash",
          price: 1249.0,
          quantity: 100,
          timeline: "2-4 weeks",
          inStock: true,
          image: "/floor/floor-1.webp",
        },
        {
          id: "SG004",
          name: "Glidden Toasted Almond",
          brand: "Casa",
          material: "Mica",
          finish: "Matte",
          dimensions: 'W: 26" H: 12"',
          color: "Light Brown",
          price: 250.0,
          quantity: 5,
          timeline: "2-3 weeks",
          inStock: true,
          image: "/wall-painting/wall-painting-2.png",
        },
        {
          id: "TB004",
          name: "SilkThread Carpet",
          brand: "Elanora",
          material: "Jute Fiber",
          finish: "Flat Weave",
          dimensions: 'W: 36" H: 42"',
          color: "Pebble Cloud Brown",
          price: 1300.0,
          quantity: 4,
          timeline: "1-4 weeks",
          inStock: true,
          image: "/carpet/carpet-2.avif",
        },
      ],
    },
  ];

  // Calculate totals
  const totals = categories.reduce(
    (acc, category) => {
      category.products.forEach((product) => {
        const subtotal = product.price * product.quantity;
        acc.totalClientPrice += subtotal;
        acc.totalTax += subtotal * 0.08;
        acc.totalProfit += subtotal * 0.25;
      });
      return acc;
    },
    {
      totalClientPrice: 0,
      totalTax: 0,
      totalProfit: 0,
    }
  );

  const totalTradePrice = totals.totalClientPrice - totals.totalProfit;
  const totalClientSavings = 10;
  const totalTradeDiscount = 15;

  const renderStatusIndicator = (productId) => {
    const status = productStatuses[productId] || "draft";

    const statusConfig = {
      approved: {
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5 text-green-600"
          >
            <path
              fillRule="evenodd"
              d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z"
              clipRule="evenodd"
            />
          </svg>
        ),
        text: "Approved",
        bgColor: "bg-green-100",
        textColor: "text-green-700",
      },
      rejected: {
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5 text-red-600"
          >
            <path
              fillRule="evenodd"
              d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
              clipRule="evenodd"
            />
          </svg>
        ),
        text: "Rejected",
        bgColor: "bg-red-100",
        textColor: "text-red-700",
      },
      draft: {
        icon: (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-5 h-5 text-gray-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3v18h18M9 9h6M9 12h6M9 15h6"
            />
          </svg>
        ),
        text: "Draft",
        bgColor: "bg-gray-100",
        textColor: "text-gray-600",
      },
    };

    const config = statusConfig[status];

    return (
      <button
        onClick={() => toggleStatus(productId)}
        className={`flex items-center gap-2 ${config.bgColor} ${config.textColor} px-3 py-1 rounded-full text-sm font-semibold hover:opacity-80 transition-opacity`}
      >
        {config.icon}
        <span>{config.text}</span>
      </button>
    );
  };

  const renderColorSwatch = (color) => {
    const colorMap = {
      Sand: "#F4E4BC",
      "Smoked Maple": "#8B6F47",
      "Clay gray": "#B8B8AA",
      "Drift wood Brown": "#6B5B47",
    };

    return (
      <div className="flex items-center gap-2">
        <div
          className="w-4 h-4 rounded-full border border-gray-300"
          style={{ backgroundColor: colorMap[color] || "#DDD" }}
        ></div>
        <span className="text-sm text-gray-600">{color}</span>
      </div>
    );
  };

  return (
    <div className="w-full mb-24">
      <div className="mt-40 px-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Specification Sheet</h1>
        </div>

        <div className="px-12">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-2xl font-bold mv">Project: Peterville Home</h2>
            <div>
              <button className="bg-black text-white px-8 py-3 rounded-xl flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-4 h-4 mr-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                <span>Download</span>
              </button>
            </div>
          </div>
          {/* Totals Header */}
          <div className="bg-gray-200 rounded-lg px-8 py-6 mb-8">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Totals</h2>
              <div className="text-center">
                <div className="text-lg font-bold">
                  ${totals.totalClientPrice.toFixed(2)}
                </div>
                <div className="text-xs text-gray-600">TOTAL CLIENT PRICE</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">
                  ${totals.totalTax.toFixed(2)}
                </div>
                <div className="text-xs text-gray-600">TOTAL TAX</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">
                  ${totals.totalProfit.toFixed(2)}
                </div>
                <div className="text-xs text-gray-600">TOTAL PROFIT</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{totalClientSavings}%</div>
                <div className="text-xs text-gray-600">
                  TOTAL CLIENT SAVINGS
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">
                  ${totalTradePrice.toFixed(2)}
                </div>
                <div className="text-xs text-gray-600">TOTAL TRADE PRICE</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{totalTradeDiscount}%</div>
                <div className="text-xs text-gray-600">
                  TOTAL TRADE DISCOUNT
                </div>
              </div>
            </div>
          </div>

          {/* Category Sections */}
          {categories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">{category.name}</h2>
                <div className="flex items-center gap-4">
                  <div className="bg-gray-200 rounded-full px-4 py-1">
                    <span className="text-sm font-semibold">
                      {category.count}
                    </span>
                  </div>
                  <button onClick={() => toggleCategory(category.name)}>
                    {expandedCategories[category.name] ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 15.75l7.5-7.5 7.5 7.5"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-6 h-6"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {expandedCategories[category.name] && (
                <div>
                  <div className="space-y-4">
                    {category.products.map((product, productIndex) => (
                      <div
                        key={productIndex}
                        className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex gap-6"
                      >
                        {/* Left Side - Image and Basic Details */}
                        <div className="w-32 flex-1">
                          <div className="relative w-full h-32 rounded-lg overflow-hidden mb-4 bg-gray-100">
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                        </div>

                        <div className="flex-1">
                          <div>
                            <h3 className="text-lg font-bold">
                              {product.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              <span className="mr-1">Brand:</span>
                              <span className="font-semibold">
                                {product.brand}
                              </span>
                            </p>
                          </div>
                          <div className="mt-4">
                            <p className="text-sm text-gray-600">
                              <span className="mr-1">Material:</span>
                              <span className="font-semibold">
                                {product.material}
                              </span>
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="mr-1">Finish:</span>
                              <span className="font-semibold">
                                {product.finish}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex-1 flex flex-col gap-2">
                          <p className="text-sm text-gray-600">
                            <span className="mr-1">Dimensions:</span>
                            <span className="font-semibold">
                              {product.dimensions}
                            </span>
                          </p>
                          <div>{renderColorSwatch(product.color)}</div>
                        </div>

                        <div className="flex-1 flex flex-col gap-8 items-center">
                          <div>
                            <p className="text-xs text-gray-500">Product ID</p>
                            <p className="text-sm font-semibold">
                              {product.id}
                            </p>
                          </div>

                          {product.inStock && (
                            <div className="inline-flex items-center bg-black text-white rounded-full px-3 py-1 text-xs font-semibold w-fit">
                              In Stock
                            </div>
                          )}
                        </div>

                        <div className="flex-1 flex flex-col gap-3">
                          <div className="flex gap-2 items-center">
                            <p className="text-xs text-gray-500">Price</p>
                            <p className="text-sm font-semibold">
                              ${product.price.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex gap-2 items-center">
                            <p className="text-xs text-gray-500">Qty</p>
                            <p className="text-sm font-semibold">
                              {product.quantity}
                            </p>
                          </div>
                          <div className="flex gap-2 items-center">
                            <p className="text-xs text-gray-500">Timeline</p>
                            <p className="text-sm font-semibold">
                              {product.timeline}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 flex-1">
                          <button className="flex gap-2 justify-center w-full px-4 py-2 border-2 border-black rounded-lg hover:bg-gray-100 transition-colors text-sm font-semibold">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                              className="w-4 h-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                              />
                            </svg>
                            Vendor
                          </button>
                          <button className="w-full px-4 py-2 border-2 border-black rounded-lg hover:bg-gray-100 transition-colors text-sm font-semibold">
                            Details
                          </button>
                          <button className="w-full px-4 py-2 border-2 border-black rounded-lg hover:bg-gray-100 transition-colors text-sm font-semibold">
                            Quote
                          </button>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center">
                          <p className="text-xs text-gray-500 mb-2 text-center">
                            Client
                          </p>
                          {renderStatusIndicator(product.id)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpecBuilder;
