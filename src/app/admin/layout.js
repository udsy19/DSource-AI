import AdminNav from "@/components/admin/AdminNav";

// Access is enforced by middleware (adminRoutes gate) and by every /api/admin/*
// route (requireAdmin). This layout just provides the shell.
export const metadata = {
  title: "Admin — DSource",
};

export default function AdminLayout({ children }) {
  return (
    <div className="flex flex-col gap-6 py-8 md:flex-row">
      <aside className="md:w-56 md:shrink-0">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Control Plane
          </p>
          <h1 className="text-lg font-semibold text-gray-900">Admin</h1>
        </div>
        <AdminNav />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
