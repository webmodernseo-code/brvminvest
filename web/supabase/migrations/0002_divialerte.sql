-- web/supabase/migrations/0002_divialerte.sql

create table if not exists divialerte_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ticker text,
  country text,
  created_at timestamptz not null default now()
);

create table if not exists divialerte_dividends (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references divialerte_companies(id) on delete cascade,
  exercice_year int not null,
  montant numeric,
  rendement numeric,
  date_detachement date,
  date_paiement date,
  updated_at timestamptz not null default now(),
  unique (company_id, exercice_year)
);

create table if not exists divialerte_watchlist (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  company_id uuid not null references divialerte_companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, company_id)
);

create table if not exists divialerte_alerts_sent (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  dividend_id uuid not null references divialerte_dividends(id) on delete cascade,
  alert_type text not null check (alert_type in ('j3', 'j1')),
  sent_at timestamptz not null default now(),
  unique (profile_id, dividend_id, alert_type)
);

alter table divialerte_companies enable row level security;
alter table divialerte_dividends enable row level security;
alter table divialerte_watchlist enable row level security;
alter table divialerte_alerts_sent enable row level security;

create policy "Public read companies" on divialerte_companies
  for select using (true);
create policy "Public read dividends" on divialerte_dividends
  for select using (true);

create policy "Users can view own watchlist" on divialerte_watchlist
  for select using (auth.uid() = profile_id);
create policy "Users can insert own watchlist" on divialerte_watchlist
  for insert with check (auth.uid() = profile_id);
create policy "Users can delete own watchlist" on divialerte_watchlist
  for delete using (auth.uid() = profile_id);
