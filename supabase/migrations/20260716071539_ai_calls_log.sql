-- Complete, append-only log of EVERY model invocation (Gemini + Replicate),
-- written by a service-role client from the request's AI-log context. RLS:
-- admin read only; inserts come via service-role (bypasses RLS).
create table if not exists public.ai_calls (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  route      text,
  label      text,
  provider   text,
  model      text,
  operation  text,
  status     text not null default 'success',
  error      text,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists ai_calls_user_time_idx on public.ai_calls (user_id, created_at desc);
create index if not exists ai_calls_route_time_idx on public.ai_calls (route, created_at desc);
create index if not exists ai_calls_time_idx on public.ai_calls (created_at desc);

alter table public.ai_calls enable row level security;
drop policy if exists "ai_calls_admin_select" on public.ai_calls;
create policy "ai_calls_admin_select" on public.ai_calls
  for select to authenticated using (public.is_admin());
