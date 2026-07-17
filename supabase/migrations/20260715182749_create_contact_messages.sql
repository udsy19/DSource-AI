create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text not null check (char_length(last_name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 320),
  country text not null check (char_length(country) between 1 and 100),
  message text not null check (char_length(message) between 1 and 5000),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Public contact form: anyone may submit, nobody may read/update/delete via the anon key.
create policy "Allow public inserts" on public.contact_messages
  for insert to anon, authenticated
  with check (true);
