import { cookies } from "next/headers";
import { createClient } from "../../../utils/supabase/server";
import { getUserRoleFromUser } from "../../utils/api-auth";
import { ROLES } from "../../utils/roles";
import VendorSidebar from "@/components/vendor/VendorSidebar";
import VendorHeader from "@/components/vendor/VendorHeader";
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
    <>
      {user && isVendor ? (
        // Break out of root layout container for full-width vendor dashboard
        <div className="fixed inset-0 overflow-auto" style={{ backgroundColor: '#E8E4E0' }}>
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="fixed left-4 top-4 bottom-4 z-40 hidden lg:block">
              <VendorSidebar />
            </aside>
            {/* Main Content Area */}
            <div className="flex-1 lg:ml-72 min-h-screen flex flex-col">
              {/* Header with background */}
              <div className="px-4 lg:px-8 pt-4 pb-2" style={{ backgroundColor: '#E8E4E0' }}>
                <VendorHeader user={user} />
              </div>
              {/* Page Content */}
              <main className="px-4 lg:px-8 py-4 flex-1">{children}</main>
            </div>
          </div>
        </div>
      ) : (
        // For non-authenticated users, show content without sidebar
        // VendorRouteGuard will handle redirecting sub-routes to /vendor
        <VendorRouteGuard>
          <div className="py-8">{children}</div>
        </VendorRouteGuard>
      )}
    </>
  );
}
