import { cookies } from "next/headers";
import VendorAuthPanel from "@/components/vendor/VendorAuthPanel";
import VendorDashboard from "@/components/vendor/VendorDashboard";
import { createClient } from "@/utils/supabase/server";
import { getUserRoleFromUser } from "@/utils/api-auth";
import { ROLES } from "@/utils/roles";

export const metadata = {
  title: "Vendor Dashboard | DSource",
  description:
    "Authenticate with Supabase email auth to manage bulk product uploads for the DSource marketplace.",
};

export default async function VendorPage() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let totalProducts = 0;
  let recentProducts = [];
  let productsError = null;
  let recentError = null;

  if (user) {
    const [countResult, recentResult] = await Promise.all([
      supabase
        .from("scraped_product_list")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id),
      supabase
        .from("scraped_product_list")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    totalProducts = countResult.count ?? 0;
    productsError = countResult.error;
    recentProducts = recentResult.data ?? [];
    recentError = recentResult.error;
  }

  const userRole = user ? getUserRoleFromUser(user) : null;
  const isVendor = userRole === ROLES.VENDOR;

  // Prepare dashboard stats
  const dashboardStats = {
    totalProducts: productsError ? 0 : totalProducts ?? 0,
    // These would ideally come from a sales/orders table - using placeholder for now
    totalSales: 1000, // Would be fetched from orders table
    totalOrders: 300, // Would be fetched from orders table
    productsSold: 5, // Would be calculated from orders
    newCustomers: 8, // Would be fetched from users table
    recentProducts: recentProducts || [],
  };

  return (
    <>
      {user && isVendor ? (
        <VendorDashboard user={user} dashboardStats={dashboardStats} />
      ) : (
        <div className="relative isolate py-16 sm:py-24">
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
            <div className="mx-auto h-full max-w-4xl bg-gradient-to-b from-gray-100 via-white to-white blur-3xl" />
          </div>
          <div className="mx-auto max-w-4xl px-4">
            <VendorAuthPanel />
          </div>
        </div>
      )}
    </>
  );
}
