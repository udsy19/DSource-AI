import { NextResponse } from "next/server";
import { requireAdmin } from "@/utils/api-auth";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Shared plumbing for /api/admin/* routes.
 *
 * Every admin endpoint: (1) enforces requireAdmin() (granted admin role OR the
 * ADMIN_EMAILS break-glass allowlist), then (2) uses the service-role client for
 * data access. Service-role bypasses RLS, so a break-glass admin who hasn't been
 * granted the DB `admin` role can still operate the dashboard. The RLS is_admin()
 * carve-outs are defense-in-depth for direct DB access.
 */
export async function adminContext() {
  const admin = await requireAdmin(); // throws "Unauthorized" / "Forbidden: ..."
  const supabase = createAdminClient();
  return { admin, supabase };
}

/** Map thrown auth errors (and misconfig) to HTTP responses. */
export function adminError(error) {
  const message = error?.message || "";
  if (message.includes("Unauthorized")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (message.includes("Forbidden")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    return NextResponse.json(
      { error: "Server is not configured for admin actions." },
      { status: 500 },
    );
  }
  console.error("admin api error");
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}

/** Append-only audit of a privileged admin action (best-effort). */
export async function writeAudit(supabase, adminId, action, fields = {}) {
  try {
    await supabase.from("admin_audit").insert({
      admin_id: adminId,
      action,
      target_user_id: fields.targetUserId ?? null,
      target_type: fields.targetType ?? null,
      target_id: fields.targetId ?? null,
      before: fields.before ?? null,
      after: fields.after ?? null,
    });
  } catch {
    console.error("admin audit write failed");
  }
}

/** Resolve a set of user ids to a { id: email } map via profiles. */
export async function emailsForIds(supabase, ids) {
  const clean = [...new Set(ids.filter(Boolean))];
  if (!clean.length) return {};
  const { data } = await supabase
    .from("profiles")
    .select("id, email")
    .in("id", clean);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.email]));
}

/** Create short-lived signed URLs for private-bucket paths. Returns a map. */
export async function signPaths(supabase, bucket, paths, expiresIn = 3600) {
  const clean = [...new Set(paths.filter(Boolean))];
  const map = {};
  await Promise.all(
    clean.map(async (path) => {
      try {
        const { data } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, expiresIn);
        if (data?.signedUrl) map[path] = data.signedUrl;
      } catch {
        /* skip unsignable paths */
      }
    }),
  );
  return map;
}
