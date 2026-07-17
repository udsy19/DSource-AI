# Migrations

The live Supabase project (`bojnqensefigniidkblx`) is canonical — every file
here mirrors a migration recorded in `supabase_migrations.schema_migrations`.
New schema changes go through `apply_migration` (MCP) or `supabase db push`,
and the applied SQL gets committed here under its live version stamp.

Four early files predate this convention and keep their original names; they
correspond to these live versions:

| Local file | Live migration |
|---|---|
| `0001_scraped_product_list.sql` | `20260715044110_create_scraped_product_list` |
| `0002_profiles_and_role_mirror.sql` | `20260715042802_profiles_and_role_mirror` + `20260715042830_harden_handle_new_user_execute` |
| `20260714_visualizer_renders.sql` | `20260715182547_visualizer_renders` |
| `20260715_product_embeddings.sql` | `20260715182601_product_embeddings` |
| `20260716_render_layers.sql` | `20260715182611_render_layers` |
| `20260717_projects.sql` | `20260716065539_visualizer_projects_folios` |
| `20260718_boards.sql` | `20260716065409_visualizer_boards` |
| `20260719_render_sessions.sql` | `20260716080125_render_sessions_base_image` |

Signup is invite-only: `20260716195837_prod_launch_hardening.sql` installs a
`before insert` trigger on `auth.users`. To invite a user, add their email to
`public.signup_allowlist` (service role / SQL editor) — `@dsource.ai`
addresses pass automatically.
