"use client";

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return { date: "N/A", time: "N/A" };
  const d = new Date(dateString);
  return {
    date: d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" }),
    time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
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
      title: "Total Sales",
      value: formatCurrency(totalSales),
      change: "+8% from yesterday",
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
        </svg>
      ),
    },
    {
      id: 2,
      title: "Total Order",
      value: totalOrders.toString(),
      change: "+5% from yesterday",
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h6v6h6v10H6z" />
        </svg>
      ),
    },
    {
      id: 3,
      title: "Product Sold",
      value: productsSold.toString(),
      change: "+2% from yesterday",
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
        </svg>
      ),
    },
    {
      id: 4,
      title: "New Customers",
      value: newCustomers.toString(),
      change: "+5% from yesterday",
      icon: (
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      ),
    },
  ];

  // Transform recent products for display
  const displayProducts = recentProducts.length > 0
    ? recentProducts.slice(0, 5).map((p, idx) => {
      const { date, time } = formatDate(p.created_at);
      const productIdStr = String(p.product_id || idx + 1);
      return {
        id: String(idx + 1).padStart(2, '0'),
        name: p.product_name || p.brand_name || "Product",
        sku: productIdStr.substring(0, 6),
        quantity: p.quantity ?? 1, // Default to 1 if no quantity field
        date,
        time,
        status: (p.quantity ?? 1) > 0 ? "Available" : "Out of Stock",
        image_url: p.image_url,
      };
    })
    : [];

  return (
    <div className="space-y-6">
      {/* Today's Sales Section */}
      <section className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Today's Sales</h2>
            <p className="text-sm text-gray-500">Sales Summary</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Export
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {salesSummary.map((item) => (
            <div
              key={item.id}
              className="rounded-xl p-5 text-white"
              style={{ background: "linear-gradient(135deg, #6B4C4C 0%, #4A3535 100%)" }}
            >
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-4">
                {item.icon}
              </div>
              <p className="text-2xl font-bold mb-1">{item.value}</p>
              <p className="text-sm font-medium opacity-90">{item.title}</p>
              <p className="text-xs opacity-70 mt-1">{item.change}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Middle Section - Top Products & Visitor Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top Products</h3>
          <div className="space-y-1">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-2 py-2 text-xs text-gray-500 uppercase tracking-wide">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Name</div>
              <div className="col-span-5">Popularity</div>
              <div className="col-span-2 text-center">Sales</div>
            </div>

            {/* Table Rows */}
            {topProducts.map((product) => (
              <div
                key={product.id}
                className="grid grid-cols-12 gap-4 items-center px-2 py-3 border-b border-gray-100 last:border-0"
              >
                <div className="col-span-1 text-sm text-gray-600">{product.id}</div>
                <div className="col-span-4 text-sm font-medium text-gray-900">
                  {product.name}
                </div>
                <div className="col-span-5">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${product.popularity}%`,
                        backgroundColor: '#2D2A2A',
                      }}
                    />
                  </div>
                </div>
                <div className="col-span-2 text-center">
                  <span className="inline-block px-3 py-1 text-sm text-gray-700 border border-gray-300 rounded-full">
                    {product.sales}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Visitor Insights */}
        <section className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Visitor Insights</h3>
          <div className="flex">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between h-48 pr-3 text-xs text-gray-400">
              <span>30K</span>
              <span>20K</span>
              <span>10K</span>
              <span>0</span>
            </div>
            {/* Chart area */}
            <div className="flex-1">
              <div className="flex items-end justify-between gap-3 h-48">
                {visitorData.map((data, index) => (
                  <div key={data.month} className="flex flex-col items-center flex-1">
                    <div
                      className="w-full max-w-8 rounded-t-lg transition-all duration-300 hover:opacity-80"
                      style={{
                        height: `${(data.value / maxVisitorValue) * 100}%`,
                        backgroundColor: index === 1 ? '#F5D45E' : '#2D2A2A',
                        minHeight: '20px',
                      }}
                    />
                  </div>
                ))}
              </div>
              {/* X-axis labels */}
              <div className="flex justify-between mt-2">
                {visitorData.map((data) => (
                  <span key={data.month} className="flex-1 text-center text-xs text-gray-500">
                    {data.month}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Products Table */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border-2 border-blue-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Your uploaded products</h3>
        <div className="overflow-x-auto">
          {displayProducts.length > 0 ? (
            <table className="w-full">
              <tbody>
                {displayProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-4 pr-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-4 pr-4 text-sm text-gray-600">{product.id}</td>
                    <td className="py-4 pr-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="py-4 pr-4 text-sm text-gray-600">{product.sku}</td>
                    <td className="py-4 pr-4 text-sm text-gray-600">{product.quantity}</td>
                    <td className="py-4 pr-4">
                      <div className="text-sm text-gray-600">
                        <div>{product.date}</div>
                        <div className="text-xs text-gray-400">at {product.time}</div>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${product.status === "Available"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                          }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No products yet. Upload products to see your catalog here.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
