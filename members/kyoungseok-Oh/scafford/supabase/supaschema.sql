-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.
-- Supabase schema example for MEOMUM.
-- backend/app/data/mock_data.py로도 실행 가능합니다.

CREATE TABLE public.categories (
  category_id text NOT NULL,
  category_name_ko text NOT NULL,
  score_weight numeric NOT NULL DEFAULT 0,
  display_order integer NOT NULL DEFAULT 0,
  CONSTRAINT categories_pkey PRIMARY KEY (category_id)
);
CREATE TABLE public.data_source_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  version_id text NOT NULL,
  metric_id text NOT NULL,
  source_file text NOT NULL,
  source_org text NOT NULL,
  source_url text,
  data_level text,
  data_ref_period text NOT NULL,
  data_ref_date date,
  unit text,
  geocoding_required boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT data_source_files_pkey PRIMARY KEY (id),
  CONSTRAINT data_source_files_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.data_versions(version_id),
  CONSTRAINT data_source_files_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES public.metrics(metric_id)
);
CREATE TABLE public.data_versions (
  version_id text NOT NULL,
  version_name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])),
  published_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT data_versions_pkey PRIMARY KEY (version_id)
);
CREATE TABLE public.metrics (
  metric_id text NOT NULL,
  category_id text NOT NULL,
  metric_name_ko text NOT NULL,
  direction text NOT NULL,
  normalization_method text NOT NULL,
  default_weight numeric NOT NULL DEFAULT 0,
  unit text,
  is_score_metric boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT metrics_pkey PRIMARY KEY (metric_id),
  CONSTRAINT metrics_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id)
);
CREATE TABLE public.recommendation_presets (
  preset_id text NOT NULL,
  preset_name_ko text NOT NULL,
  traffic_weight numeric NOT NULL,
  culture_weight numeric NOT NULL,
  convenience_weight numeric NOT NULL,
  safety_weight numeric NOT NULL,
  nature_weight numeric NOT NULL,
  CONSTRAINT recommendation_presets_pkey PRIMARY KEY (preset_id)
);
CREATE TABLE public.region_metric_values (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  region_id text NOT NULL,
  metric_id text NOT NULL,
  region_level text NOT NULL DEFAULT 'sido'::text,
  raw_value numeric,
  cleaned_value numeric,
  normalized_value numeric CHECK (normalized_value IS NULL OR normalized_value >= 0::numeric AND normalized_value <= 1::numeric),
  score_100 numeric CHECK (score_100 IS NULL OR score_100 >= 0::numeric AND score_100 <= 100::numeric),
  unit text,
  imputation_method text DEFAULT 'none'::text,
  is_outlier boolean NOT NULL DEFAULT false,
  source_file text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  direction text,
  normalization_method text,
  CONSTRAINT region_metric_values_pkey PRIMARY KEY (id),
  CONSTRAINT region_metric_values_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(region_id),
  CONSTRAINT region_metric_values_metric_id_fkey FOREIGN KEY (metric_id) REFERENCES public.metrics(metric_id)
);
CREATE TABLE public.regions (
  region_id text NOT NULL,
  region_level text NOT NULL CHECK (region_level = ANY (ARRAY['sido'::text, 'sigungu'::text])),
  region_name_ko text NOT NULL,
  parent_region_id text,
  population bigint,
  area_km2 numeric,
  latitude numeric,
  longitude numeric,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT regions_pkey PRIMARY KEY (region_id),
  CONSTRAINT regions_parent_region_id_fkey FOREIGN KEY (parent_region_id) REFERENCES public.regions(region_id)
);
CREATE TABLE public.stg_region_metric_values (
  region_id text NOT NULL,
  region_level text NOT NULL CHECK (region_level = ANY (ARRAY['sido'::text, 'sigungu'::text])),
  region_name text NOT NULL,
  category_id text NOT NULL,
  metric_id text NOT NULL,
  raw_value numeric,
  cleaned_value numeric,
  normalized_value numeric,
  score_100 numeric,
  unit text,
  direction text,
  normalization_method text,
  imputation_method text NOT NULL DEFAULT 'none'::text,
  is_outlier boolean NOT NULL DEFAULT false,
  source_file text,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE public.stg_regions_sigungu (
  region_id text NOT NULL,
  region_level text NOT NULL CHECK (region_level = ANY (ARRAY['sido'::text, 'sigungu'::text])),
  region_name_ko text NOT NULL,
  parent_region_id text,
  parent_region_name_ko text,
  full_region_name_ko text,
  lawd_code10 text,
  CONSTRAINT stg_regions_sigungu_pkey PRIMARY KEY (region_id)
);