-- web/supabase/migrations/0001_init.sql

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text not null,
  prenom text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table if not exists veille_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text not null,
  source_name text not null,
  source_url text not null unique,
  published_at timestamptz not null,
  scraped_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists veille_videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text not null,
  youtube_video_id text not null unique,
  channel_name text not null,
  published_at timestamptz not null,
  scraped_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists veille_youtube_channels (
  id uuid primary key default gen_random_uuid(),
  channel_name text not null,
  channel_id text not null unique,
  active boolean not null default true
);

create table if not exists veille_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create table if not exists veille_favorites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  content_type text not null check (content_type in ('article', 'video')),
  content_id uuid not null,
  created_at timestamptz not null default now(),
  unique (profile_id, content_type, content_id)
);

alter table profiles enable row level security;
alter table veille_favorites enable row level security;
alter table veille_articles enable row level security;
alter table veille_videos enable row level security;
alter table veille_youtube_channels enable row level security;
alter table veille_subscribers enable row level security;

create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can view own favorites" on veille_favorites
  for select using (auth.uid() = profile_id);
create policy "Users can insert own favorites" on veille_favorites
  for insert with check (auth.uid() = profile_id);
create policy "Users can delete own favorites" on veille_favorites
  for delete using (auth.uid() = profile_id);

create policy "Public read articles" on veille_articles
  for select using (true);
create policy "Public read videos" on veille_videos
  for select using (true);
create policy "Public read channels" on veille_youtube_channels
  for select using (true);
