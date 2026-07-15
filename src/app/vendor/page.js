import { cookies } from "next/headers";
import VendorAuthPanel from "@/components/vendor/VendorAuthPanel";
import VendorDashboard from "@/components/vendor/VendorDashboard";
import { getUserRoleFromUser } from "@/utils/api-auth";
import { ROLES } from "@/utils/roles";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
  title: "Vendor Dashboard | DSource",
  description:
    "Authenticate with Supabase email auth to manage bulk product uploads for the DSource marketplace.",
};

export default async function VendorPage() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);

  const [
    {
      data: { user },
    },
  ] = await Promise.all([supabase.auth.getUser(), supabase.auth.getSession()]);

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

  // Dashboard stats: real queries only — orders/sales have no source yet
  // and render as em-dash cells in the dashboard, never invented numbers.
  const dashboardStats = {
    totalProducts: productsError ? 0 : (totalProducts ?? 0),
    recentProducts: recentError ? [] : (recentProducts ?? []),
  };

  return (
    <>
      {user && isVendor
        ? <VendorDashboard dashboardStats={dashboardStats} />
        : <div className="viz-scope viz-grain flex min-h-svh items-center justify-center px-4 pt-24 pb-14 sm:px-6">
            <div className="w-full max-w-4xl">
              <VendorAuthPanel />
            </div>
          </div>}
    </>
  );
}
