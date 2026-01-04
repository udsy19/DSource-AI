import { cookies } from "next/headers";
import { createClient } from "../../../utils/supabase/server";
import { getUserRoleFromUser } from "../../utils/api-auth";
import { ROLES } from "../../utils/roles";
import VendorSidebar from "@/components/vendor/VendorSidebar";
import VendorRouteGuard from "@/components/vendor/VendorRouteGuard";
import { redirect } from "next/navigation";

export default async function VendorLayout({ children }) {
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userRole = user ? getUserRoleFromUser(user) : null;
  const isVendor = userRole === ROLES.VENDOR;

  // Only show sidebar if user is authenticated as vendor
  // Otherwise, let the page handle the auth panel
  if (user && !isVendor) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user && isVendor ? (
        <div className="flex">
          {/* Sidebar */}
          <aside className="fixed left-4 top-4 bottom-4 z-40 hidden lg:block">
            <VendorSidebar />
          </aside>
          {/* Main Content */}
          <main className="flex-1 lg:ml-72 px-4 lg:px-8 py-32">{children}</main>
        </div>
      ) : (
        // For non-authenticated users, show content without sidebar
        // VendorRouteGuard will handle redirecting sub-routes to /vendor
        <VendorRouteGuard>
          <div className="py-8">{children}</div>
        </VendorRouteGuard>
      )}
    </div>
  );
}
