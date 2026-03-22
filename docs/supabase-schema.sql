create extension if not exists pgcrypto;

create table if not exists public.ppeyes_watchlist_terms (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('品牌词', '竞品词', '行业词', '风险词')),
  keyword text not null,
  keyword_normalized text not null,
  priority text not null check (priority in ('高', '中', '低')),
  alerts boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists ppeyes_watchlist_terms_type_keyword_norm_key
  on public.ppeyes_watchlist_terms (type, keyword_normalized);

create table if not exists public.ppeyes_saved_opportunities (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  title text not null,
  timing text not null,
  format text not null,
  note text not null,
  status text not null check (status in ('新入池', '已选题', '推进中', '已归档')),
  created_at timestamptz not null default now()
);

alter table public.ppeyes_watchlist_terms enable row level security;
alter table public.ppeyes_saved_opportunities enable row level security;
