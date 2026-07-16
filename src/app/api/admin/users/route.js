import { NextResponse } from "next/server";
import { adminContext, adminError } from "@/utils/admin-api";

const PER_PAGE = 50;

// GET /api/admin/users?page=1&q=search — list all users (auth + profile).
export async function GET(request) {
  try {
    const { supabase } = await adminContext();
    const { searchParams } = new URL(request.url);
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10),
    );
    const q = (searchParams.get("q") || "").trim().toLowerCase();

    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    });
    if (error) throw error;

    const users = data?.users ?? [];
    const ids = users.map((u) => u.id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, role, banned, last_seen_at")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const byId = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

    let rows = users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      email_confirmed: !!u.email_confirmed_at,
      role: u.app_metadata?.user_type || byId[u.id]?.role || "user",
      banned: !!byId[u.id]?.banned || !!u.banned_until,
      last_seen_at: byId[u.id]?.last_seen_at ?? null,
    }));

    if (q) rows = rows.filter((r) => r.email?.toLowerCase().includes(q));

    return NextResponse.json({ users: rows, page, perPage: PER_PAGE });
  } catch (error) {
    return adminError(error);
  }
}
