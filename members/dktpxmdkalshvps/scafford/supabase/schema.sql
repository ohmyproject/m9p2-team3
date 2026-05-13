-- Supabase schema example for MEOMUM.
-- MVP는 backend/app/data/mock_data.py로도 실행 가능합니다.

create table if not exists public.regions (
  region_id text primary key,
  region_level text not null check (region_level in ('sido', 'sigungu')),
  region_name_ko text not null,
  region_name_en text,
  parent_region_id text,
  parent_region_name_ko text,
  parent_logo_key text,
  latitude numeric,
  longitude numeric,
  map_x numeric,
  map_y numeric
);

create table if not exists public.region_category_scores (
  region_id text references public.regions(region_id) on delete cascade,
  traffic numeric not null,
  culture numeric not null,
  convenience numeric not null,
  safety numeric not null,
  nature numeric not null,
  primary key (region_id)
);

create table if not exists public.metric_metadata (
  metric_id text primary key,
  category text not null,
  name_ko text not null,
  name_en text,
  unit text,
  source text,
  data_level text,
  description text,
  year text
);

create table if not exists public.region_metrics (
  region_id text references public.regions(region_id) on delete cascade,
  metric_id text references public.metric_metadata(metric_id) on delete cascade,
  score_100 numeric not null,
  raw_value numeric,
  primary key (region_id, metric_id)
);

create table if not exists public.tourist_spots (
  id bigserial primary key,
  region_id text references public.regions(region_id) on delete cascade,
  name text not null,
  type text,
  description text,
  address text
);

create table if not exists public.presets (
  preset_id text primary key,
  name_ko text not null,
  name_en text,
  description_ko text,
  description_en text,
  traffic numeric not null,
  culture numeric not null,
  convenience numeric not null,
  safety numeric not null,
  nature numeric not null
);

alter table public.regions enable row level security;
alter table public.region_category_scores enable row level security;
alter table public.metric_metadata enable row level security;
alter table public.region_metrics enable row level security;
alter table public.tourist_spots enable row level security;
alter table public.presets enable row level security;

create policy "Allow public read regions" on public.regions for select using (true);
create policy "Allow public read category scores" on public.region_category_scores for select using (true);
create policy "Allow public read metric metadata" on public.metric_metadata for select using (true);
create policy "Allow public read region metrics" on public.region_metrics for select using (true);
create policy "Allow public read tourist spots" on public.tourist_spots for select using (true);
create policy "Allow public read presets" on public.presets for select using (true);
