# DSource — Production Readiness

> Status for the internal launch (10–15 users). Replaces the July 14 audit,
> whose findings are all resolved or tracked below. Full re-audit: 2026-07-16.

## Verdict

**Ready to deploy** once the remaining user actions below are done. The
codebase passed a five-track audit (auth/security, API routes, client pages,
infra/build, live database) with no launch blockers left in code.

## What's in place

- **Auth**: roles only in server-controlled `app_metadata`; verified
  `getUser()` gating; middleware at `src/middleware.js`; no self-promotion
  path; service-role key server-only; env files never committed.
- **Signup is invite-only**: a `before insert` trigger on `auth.users`
  rejects emails that aren't `@dsource.ai` or in `public.signup_allowlist`
  (migration `20260716195837`). Invite = add a row to `signup_allowlist`.
  Optional client-side gate via `NEXT_PUBLIC_SIGNUP_ALLOWED_DOMAINS`.
- **Database**: RLS on every table with owner-scoped policies; live project
  and `supabase/migrations/` reconciled (see `supabase/migrations/README.md`);
  security advisors clean; FK indexes covered.
- **AI routes**: all authenticated; timeout + backoff + safety-block handling
  via `src/utils/gemini.js` on every Gemini call (including cad-convert);
  input caps; no raw error detail leaked to clients.
- **Build/CI**: Next 15.5.20 (middleware-bypass advisories patched), `ws`
  patched, clean `next build` verified, CI runs lint + build + tests,
  Node pinned, `outputFileTracingRoot` set (sibling-checkout lockfile trap).
- **Honest UX**: no fake features remain — CAD tab links to the real
  `/cad-studio`, vendor stats show real counts or em-dashes, spec builder
  computes from real data and persists to localStorage, contact is a
  `mailto:`, the landing demo is labeled as an illustration.

## Deploy checklist (user actions)

1. **Vercel**: import the GitHub repo (framework: Next.js, root =
   `dsource-client/dsource-client`). Set env vars:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `GOOGLE_GENAI_API_KEY`, `REPLICATE_API_TOKEN`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`, `NEXT_PUBLIC_SITE_URL`;
   optional: `MATERIAL_BANK_API_URL`, `CAD_EXPORT_URL`, `CAD_EXPORT_TOKEN`,
   `NEXT_PUBLIC_SIGNUP_ALLOWED_DOMAINS`. Never set `DEV_AUTH_BYPASS`.
2. **Rotate the Replicate API token** (it was exposed in a chat) and top up
   Replicate credit — under $5 throttles to 6 predictions/min, which reads
   as "slow renders".
3. **Supabase dashboard**: enable leaked-password protection
   (Auth → Providers → Password). Consider Pro plan for daily backups once
   real specs/renders accumulate.
4. **Invite the team**: `insert into public.signup_allowlist (email) values
   ('teammate@example.com');` — `@dsource.ai` addresses pass automatically.
5. **After first deploy**: exercise login → render → spec PDF → vendor CSV
   once on the deployed URL (especially `/api/images/*` paths, which read
   from the filesystem).

## Known limitations (accepted for internal scale)

- Rate limiting is in-memory per-instance — fine single-instance; move to a
  durable store before any public launch.
- The marketplace's live prices depend on the material-bank VPS
  (`MATERIAL_BANK_API_URL`) — a single self-managed box; marketplace search
  degrades if it's down.
- No error tracking (Vercel logs only). Add Sentry if alerting is wanted.
- CSP allows `unsafe-inline`/`unsafe-eval` (Next.js runtime); tighten with
  nonces before public launch.
- No pagination on vendor product lists (capped selects instead) — revisit
  past a few thousand rows.

## Open decisions

- **PR #9 (admin control plane)**: the DB side (audit/capture tables,
  `is_admin`, storage buckets) is applied live and `api/admin/grant-role` is
  on main, but the 44-file admin dashboard UI never merged and has diverged
  from main. Decide: rebase and land it, or close it and keep admin ops in
  the Supabase dashboard.
