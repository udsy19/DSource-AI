-- Render sessions: remember the ORIGINAL room upload alongside each render so
-- reopening a render can restore the full working session (canvas + "reset to
-- original"). The value is a storage path in the private visualizer-renders
-- bucket ({user_id}/{render_id}-base.{ext}, or the path of an earlier render's
-- base for chained edits). Apply in the Supabase SQL editor (or
-- `supabase db push`); until then renders persist without a base image and
-- restore falls back to the render itself.

alter table public.visualizer_renders
  add column if not exists base_image_path text;
