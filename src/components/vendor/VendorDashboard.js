"use client";

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return { date: "N/A", time: "N/A" };
  const d = new Date(dateString);
  return {
    date: d.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    }),
    time: d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  };
};

// Format currency
const formatCurrency = (value) => {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
};

// Visitor data (static for now - would come from analytics)
const visitorData = [
  { month: "Jan", value: 25000 },
  { month: "Feb", value: 30000 },
  { month: "Mar", value: 18000 },
  { month: "Apr", value: 22000 },
  { month: "May", value: 28000 },
  { month: "Jun", value: 20000 },
];

// Top products sample data (static for now)
const topProducts = [
  { id: 1, name: "Home Decor", popularity: 90, sales: 45 },
  { id: 2, name: "Modern Lamp", popularity: 65, sales: 29 },
  { id: 3, name: "Bathroom", popularity: 40, sales: 18 },
  { id: 4, name: "Bedroom", popularity: 55, sales: 25 },
];

export default function VendorDashboard({ user, dashboardStats }) {
  const {
    totalProducts = 0,
    totalSales = 0,
    totalOrders = 0,
    productsSold = 0,
    newCustomers = 0,
    recentProducts = [],
  } = dashboardStats || {};

  const maxVisitorValue = Math.max(...visitorData.map((d) => d.value));

  // Build sales summary cards with real data
  const salesSummary = [
    {
      id: 1,
      title: "Total sales",
      value: formatCurrency(totalSales),
      change: "+8% from yesterday",
    },
    {
      id: 2,
      title: "Total orders",
      value: totalOrders.toString(),
      change: "+5% from yesterday",
    },
    {
      id: 3,
      title: "Products sold",
      value: productsSold.toString(),
      change: "+2% from yesterday",
    },
    {
      id: 4,
      title: "New customers",
      value: newCustomers.toString(),
      change: "+5% from yesterday",
    },
  ];

  // Transform recent products for display
  const displayProducts =
    recentProducts.length > 0
      ? recentProducts.slice(0, 5).map((p, idx) => {
          const { date, time } = formatDate(p.created_at);
          const productIdStr = String(p.product_id || idx + 1);
          return {
            id: String(idx + 1).padStart(2, "0"),
            name: p.product_name || p.brand_name || "Product",
            sku: productIdStr.substring(0, 6),
            quantity: p.quantity ?? 1, // Default to 1 if no quantity field
            date,
            time,
            status: (p.quantity ?? 1) > 0 ? "Available" : "Out of stock",
            image_url: p.image_url,
          };
        })
      : [];

  return (
    <div className="space-y-6">
      {/* Today's sales */}
      <section className="viz-panel p-6">
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--viz-line)] pb-4">
          <div>
            <h2 className="viz-serif text-xl">Today&rsquo;s sales</h2>
            <p className="viz-label mt-1">Sales summary</p>
          </div>
          <button
            type="button"
            className="viz-mono cursor-pointer rounded-md border border-[var(--viz-line)] px-4 py-2 text-xs uppercase tracking-[0.08em] text-[var(--viz-muted)] transition-colors hover:text-[var(--viz-ink)]"
          >
            Export
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {salesSummary.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-[var(--viz-line)] p-5"
            >
              <p className="viz-label">{item.title}</p>
              <p className="viz-serif mt-3 text-3xl">{item.value}</p>
              <p className="mt-1 text-xs text-[var(--viz-muted)]">
                {item.change}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Middle Section - Top products & Visitor insights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top products */}
        <section className="viz-panel p-6">
          <h3 className="viz-serif mb-4 text-xl">Top products</h3>
          <div>
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 border-b border-[var(--viz-line)] px-2 py-2">
              <div className="viz-label col-span-1">#</div>
              <div className="viz-label col-span-4">Name</div>
              <div className="viz-label col-span-5">Popularity</div>
              <div className="viz-label col-span-2 text-center">Sales</div>
            </div>

            {/* Table Rows */}
            {topProducts.map((product) => (
              <div
                key={product.id}
                className="grid grid-cols-12 items-center gap-4 border-b border-[var(--viz-line)] px-2 py-3 last:border-0"
              >
                <div className="viz-mono col-span-1 text-sm text-[var(--viz-muted)]">
                  {product.id}
                </div>
                <div className="col-span-4 text-sm text-[var(--viz-ink)]">
                  {product.name}
                </div>
                <div className="col-span-5">
                  <div className="h-1.5 w-full rounded-full bg-[var(--viz-line)]">
                    <div
                      className="h-1.5 rounded-full bg-[var(--viz-ink)]"
                      style={{ width: `${product.popularity}%` }}
                    />
                  </div>
                </div>
                <div className="viz-mono col-span-2 text-center text-sm text-[var(--viz-blue)]">
                  {product.sales}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Visitor insights */}
        <section className="viz-panel p-6">
          <h3 className="viz-serif mb-4 text-xl">Visitor insights</h3>
          <div className="flex">
            {/* Y-axis labels */}
            <div className="viz-label flex h-48 flex-col justify-between pr-3">
              <span>30K</span>
              <span>20K</span>
              <span>10K</span>
              <span>0</span>
            </div>
            {/* Chart area */}
            <div className="flex-1">
              <div className="flex h-48 items-end justify-between gap-3 border-b border-[var(--viz-line)]">
                {visitorData.map((data, index) => (
                  <div
                    key={data.month}
                    className="flex flex-1 flex-col items-center"
                  >
                    <div
                      className={`w-full max-w-8 transition-opacity duration-300 hover:opacity-80 ${
                        index === 1
                          ? "bg-[var(--viz-blue)]"
                          : "bg-[var(--viz-ink)]"
                      }`}
                      style={{
                        height: `${(data.value / maxVisitorValue) * 100}%`,
                        minHeight: "20px",
                      }}
                    />
                  </div>
                ))}
              </div>
              {/* X-axis labels */}
              <div className="mt-2 flex justify-between">
                {visitorData.map((data) => (
                  <span
                    key={data.month}
                    className="viz-label flex-1 text-center"
                  >
                    {data.month}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Products Table */}
      <section className="viz-panel p-6">
        <h3 className="viz-serif mb-4 text-xl">Your uploaded products</h3>
        <div className="overflow-x-auto">
          {displayProducts.length > 0
            ? <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--viz-line)]">
                    <th className="py-2 pr-4" aria-label="Select" />
                    <th className="viz-label py-2 pr-4 text-left font-normal">
                      #
                    </th>
                    <th className="viz-label py-2 pr-4 text-left font-normal">
                      Image
                    </th>
                    <th className="viz-label py-2 pr-4 text-left font-normal">
                      Product
                    </th>
                    <th className="viz-label py-2 pr-4 text-left font-normal">
                      SKU
                    </th>
                    <th className="viz-label py-2 pr-4 text-left font-normal">
                      QTY
                    </th>
                    <th className="viz-label py-2 pr-4 text-left font-normal">
                      Added
                    </th>
                    <th className="viz-label py-2 pr-4 text-left font-normal">
                      Status
                    </th>
                    <th className="viz-label py-2 text-left font-normal">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-[var(--viz-line)] last:border-0"
                    >
                      <td className="py-4 pr-4">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[var(--viz-blue)]"
                        />
                      </td>
                      <td className="viz-mono py-4 pr-4 text-sm text-[var(--viz-muted)]">
                        {product.id}
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-[var(--viz-line)] bg-[var(--viz-ground)]">
                          {product.image_url
                            ? <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            : <svg
                                className="h-6 w-6 text-[var(--viz-muted)]"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>}
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-sm font-medium text-[var(--viz-ink)]">
                        {product.name}
                      </td>
                      <td className="viz-mono py-4 pr-4 text-sm text-[var(--viz-muted)]">
                        {product.sku}
                      </td>
                      <td className="viz-mono py-4 pr-4 text-sm text-[var(--viz-muted)]">
                        {product.quantity}
                      </td>
                      <td className="py-4 pr-4">
                        <div className="viz-mono text-sm text-[var(--viz-muted)]">
                          <div>{product.date}</div>
                          <div className="text-xs">at {product.time}</div>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span
                          className={`viz-mono inline-block rounded-full border px-3 py-1 text-xs ${
                            product.status === "Available"
                              ? "border-[var(--viz-blue)]/40 bg-[var(--viz-blue)]/5 text-[var(--viz-blue-deep)]"
                              : "border-red-300 bg-red-50 text-red-700"
                          }`}
                        >
                          {product.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label="View product"
                            className="cursor-pointer p-2 text-[var(--viz-muted)] transition-colors hover:text-[var(--viz-ink)]"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            aria-label="Edit product"
                            className="cursor-pointer p-2 text-[var(--viz-muted)] transition-colors hover:text-[var(--viz-ink)]"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            type="button"
                            aria-label="Delete product"
                            className="cursor-pointer p-2 text-[var(--viz-muted)] transition-colors hover:text-red-700"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            : <p className="viz-mono py-8 text-center text-sm text-[var(--viz-muted)]">
                No products yet — your first upload appears here.
              </p>}
        </div>
      </section>
    </div>
  );
}
