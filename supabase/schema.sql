-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.orders (
  id         text primary key,
  created_at timestamptz not null default now(),
  status     text not null,
  queue_id   text,
  version    integer not null default 0,
  data       jsonb not null
);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_queue_id_idx   on public.orders (queue_id);
create index if not exists orders_status_idx     on public.orders (status);

create table if not exists public.settings (
  key   text primary key,
  value jsonb not null
);

create table if not exists public.webhook_log (
  id    bigserial primary key,
  at    timestamptz not null default now(),
  entry jsonb not null
);

-- The app talks to Supabase only from the server with the service-role key.
-- Enabling RLS with no policies blocks the public anon key from reading orders.
alter table public.orders      enable row level security;
alter table public.settings    enable row level security;
alter table public.webhook_log enable row level security;
