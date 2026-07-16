-- Layer graph for visualizer renders: a compact jsonb record of how each
-- render was built (base photo → edit steps → detected components → pinned
-- materials). Written pre-sanitized by the API (src/utils/visualizer/layers.js);
-- text and coordinates only — image bytes stay in storage. Apply in the
-- Supabase SQL editor (or `supabase db push`); until then renders simply
-- persist without layers.

alter table public.visualizer_renders
  add column if not exists layers jsonb;
