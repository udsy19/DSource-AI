import { NextResponse } from "next/server";
import { adminContext, adminError, writeAudit } from "@/utils/admin-api";
import { isValidRole } from "@/utils/roles";

// A ban_duration far in the future = effectively permanent until unbanned.
const PERMANENT_BAN = "876000h"; // ~100 years

// POST /api/admin/users/[id]/action  { action: "ban"|"unban"|"role", role?, reason? }
export async function POST(request, { params }) {
  try {
    const { admin, supabase } = await adminContext();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    const isSelf = id === admin.id;

    if (action === "ban") {
      if (isSelf) {
        return NextResponse.json(
          { error: "You can't ban yourself." },
          { status: 400 },
        );
      }
      await supabase.auth.admin.updateUserById(id, {
        ban_duration: PERMANENT_BAN,
      });
      await supabase
        .from("profiles")
        .update({
          banned: true,
          banned_reason: body.reason ?? null,
          banned_at: new Date().toISOString(),
        })
        .eq("id", id);
      await writeAudit(supabase, admin.id, "ban_user", {
        targetUserId: id,
        after: { reason: body.reason ?? null },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "unban") {
      await supabase.auth.admin.updateUserById(id, { ban_duration: "none" });
      await supabase
        .from("profiles")
        .update({ banned: false, banned_reason: null, banned_at: null })
        .eq("id", id);
      await writeAudit(supabase, admin.id, "unban_user", { targetUserId: id });
      return NextResponse.json({ success: true });
    }

    if (action === "role") {
      const role = body?.role;
      if (!isValidRole(role)) {
        return NextResponse.json({ error: "Invalid role." }, { status: 400 });
      }
      if (isSelf && role !== "admin") {
        return NextResponse.json(
          { error: "You can't remove your own admin access." },
          { status: 400 },
        );
      }
      await supabase.auth.admin.updateUserById(id, {
        app_metadata: { user_type: role },
      });
      await supabase
        .from("profiles")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("id", id);
      await writeAudit(supabase, admin.id, "change_role", {
        targetUserId: id,
        after: { role },
      });
      return NextResponse.json({ success: true, role });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return adminError(error);
  }
}
