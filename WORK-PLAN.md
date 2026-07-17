# DSource — Work Plan & Branching Guide

> The July 14 real-vs-mock audit that used to live here is fully resolved —
> current launch status lives in `PRODUCTION-READINESS.md`. What remains is
> the branching workflow, which still applies.

## Branching workflow

Work each area in its own branch. Keep `main` deployable.

```
<type>/<area>-<short-desc>     # feat/ fix/ refactor/ chore/
```

**Day-to-day:**

```bash
git checkout main && git pull origin main
git checkout -b feat/<area>-<desc>
# ...commit as you go...
git push -u origin feat/<area>-<desc>
gh pr create --base main --title "..." --body "..."
```

**Rules of thumb:**

- One concern per branch; small, reviewable PRs.
- Never commit directly to `main`.
- Rebase on `main` before opening a PR.
- Before writing new code, search for an existing helper to reuse
  (`src/utils/`).
- Schema changes: apply to the live Supabase project and commit the SQL under
  `supabase/migrations/` in the same PR (see `supabase/migrations/README.md`).

## Repo

`origin` → `https://github.com/udsy19/DSource-AI.git` · default branch `main`.
