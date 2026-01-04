import { cookies } from "next/headers";
import VendorAuthPanel from "@/components/vendor/VendorAuthPanel";
import VendorDashboard from "@/components/vendor/VendorDashboard";
import { createClient } from "../../../utils/supabase/server";
import { getUserRoleFromUser } from "../../utils/api-auth";
import { ROLES } from "../../utils/roles";

export const metadata = {
  title: "Vendor Dashboard | DSource",
  description:
    "Authenticate with Supabase email auth to manage bulk product uploads for the DSource marketplace.",
};

export default async function VendorPage() {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  const [
    {
      data: { user },
      error: userError,
    },
    { data: sessionData },
    { count, error: productsError },
  ] = await Promise.all([
    supabase.auth.getUser(), // Use getUser() to get full user object with metadata
    supabase.auth.getSession(),
    supabase
      .from("scraped_product_list")
      .select("*", { count: "exact", head: true }),
  ]);

  const totalProducts = productsError ? 0 : count ?? 0;

  // Debug logging
  console.log("User from getUser():", user);
  console.log("User metadata:", user?.user_metadata);
  console.log("App metadata:", user?.app_metadata);
  console.log("User error:", userError);

  const userRole = user ? getUserRoleFromUser(user) : null;
  const isVendor = userRole === ROLES.VENDOR;

  console.log("userRole", userRole);
  console.log("isVendor", isVendor);

  return (
    <>
      {user && isVendor ? (
        <VendorDashboard user={user} productStats={{ totalProducts }} />
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
