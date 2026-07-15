import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import VendorHeader from "@/components/vendor/VendorHeader";
import VendorRouteGuard from "@/components/vendor/VendorRouteGuard";
import VendorSidebar from "@/components/vendor/VendorSidebar";
import { getUserRoleFromUser } from "@/utils/api-auth";
import { ROLES } from "@/utils/roles";
import { createClient } from "@/utils/supabase/server";

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
    <>
      {user && isVendor
        ? // Break out of root layout container for full-width vendor dashboard:
          // the grain board is the ground, the sidebar is a paper panel pinned left.
          <div className="viz-scope viz-grain fixed inset-0 overflow-auto">
            <div className="flex min-h-screen">
              {/* Sidebar */}
              <aside className="fixed top-4 bottom-4 left-4 z-40 hidden lg:block">
                <VendorSidebar />
              </aside>
              {/* Main Content Area */}
              <div className="flex min-h-screen flex-1 flex-col lg:ml-72">
                <div className="px-4 pt-6 lg:px-8">
                  <VendorHeader user={user} />
                </div>
                {/* Page Content */}
                <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
              </div>
            </div>
          </div>
        : // For non-authenticated users, show content without sidebar
          // VendorRouteGuard will handle redirecting sub-routes to /vendor
          <VendorRouteGuard>{children}</VendorRouteGuard>}
    </>
  );
}
