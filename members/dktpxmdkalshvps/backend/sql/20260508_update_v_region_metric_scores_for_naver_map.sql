-- 머묾 v1.2.1 추천 조회용 View 보완
-- 목적:
-- 1) 시군구 추천 결과에서 상위 시도명을 함께 반환한다.
-- 2) 네이버지도 검색용 full_region_name_ko를 View 단계에서 생성한다.
-- 3) 기존 FastAPI가 사용하던 score 필드(category/metric/default_weight/is_score_metric/unit)를 유지한다.
--
-- 실행 위치: Supabase SQL Editor
-- 실행 후: FastAPI 서버 재시작 또는 /scores, /recommendations 재호출
--
-- 참고: 기존 View 컬럼 순서가 다른 경우 CREATE OR REPLACE VIEW가 실패할 수 있어 DROP 후 재생성한다.
--       이 View를 참조하는 다른 View가 있으면 먼저 의존성을 확인한다.

BEGIN;

DROP VIEW IF EXISTS public.v_region_metric_scores;

DO $do$
DECLARE
  category_table_name text;
  category_name_expr text;
  weight_expr text;
  is_score_metric_expr text;
  unit_expr text;
  region_name_en_expr text;
  parent_region_id_expr text;
  parent_region_name_expr text;
  full_region_name_expr text;
  latitude_expr text;
  longitude_expr text;
  parent_join_sql text;
BEGIN
  IF to_regclass('public.categories') IS NOT NULL THEN
    category_table_name := 'public.categories';
  ELSIF to_regclass('public.metric_categories') IS NOT NULL THEN
    category_table_name := 'public.metric_categories';
  ELSE
    RAISE EXCEPTION 'public.categories 또는 public.metric_categories 테이블이 필요합니다.';
  END IF;

  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = split_part(category_table_name, '.', 1)
        AND table_name = split_part(category_table_name, '.', 2)
        AND column_name = 'category_name_ko'
    ) THEN 'c.category_name_ko'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = split_part(category_table_name, '.', 1)
        AND table_name = split_part(category_table_name, '.', 2)
        AND column_name = 'name_ko'
    ) THEN 'c.name_ko'
    ELSE 'm.category_id'
  END INTO category_name_expr;

  weight_expr := CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'metrics' AND column_name = 'default_weight'
    ) THEN 'm.default_weight'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'metrics' AND column_name = 'weight'
    ) THEN 'm.weight'
    ELSE 'NULL::numeric'
  END;

  is_score_metric_expr := CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'metrics' AND column_name = 'is_score_metric'
    ) THEN 'm.is_score_metric'
    ELSE '(m.category_id <> ''auxiliary'')'
  END;

  unit_expr := CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'region_metric_values' AND column_name = 'unit'
    ) THEN 'rmv.unit'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'metrics' AND column_name = 'unit'
    ) THEN 'm.unit'
    ELSE 'NULL::text'
  END;

  region_name_en_expr := CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'region_name_en'
    ) THEN 'r.region_name_en'
    ELSE 'NULL::text'
  END;

  latitude_expr := CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'latitude'
    ) THEN 'r.latitude'
    ELSE 'NULL::numeric'
  END;

  longitude_expr := CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'longitude'
    ) THEN 'r.longitude'
    ELSE 'NULL::numeric'
  END;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'parent_region_id'
  ) THEN
    parent_region_id_expr := 'r.parent_region_id';
    parent_region_name_expr := 'pr.region_name_ko';
    full_region_name_expr := $case$CASE
      WHEN r.region_level = 'sigungu' AND pr.region_name_ko IS NOT NULL
        THEN pr.region_name_ko || ' ' || r.region_name_ko
      ELSE r.region_name_ko
    END$case$;
    parent_join_sql := 'LEFT JOIN public.regions pr ON pr.region_id = r.parent_region_id';
  ELSE
    parent_region_id_expr := 'NULL::text';
    parent_region_name_expr := 'NULL::text';
    full_region_name_expr := 'r.region_name_ko';
    parent_join_sql := '';
  END IF;

  EXECUTE format($view$
    CREATE VIEW public.v_region_metric_scores AS
    SELECT
      r.region_id,
      r.region_name_ko,
      r.region_level,
      %s AS region_name_en,
      %s AS parent_region_id,
      %s AS parent_region_name_ko,
      %s AS full_region_name_ko,
      %s AS latitude,
      %s AS longitude,
      m.category_id,
      %s AS category_name_ko,
      m.metric_id,
      m.metric_name_ko,
      %s AS default_weight,
      %s AS is_score_metric,
      rmv.raw_value,
      rmv.normalized_value,
      rmv.score_100,
      %s AS unit
    FROM public.region_metric_values rmv
    JOIN public.regions r ON r.region_id = rmv.region_id
    %s
    JOIN public.metrics m ON m.metric_id = rmv.metric_id
    LEFT JOIN %s c ON c.category_id = m.category_id;
  $view$,
    region_name_en_expr,
    parent_region_id_expr,
    parent_region_name_expr,
    full_region_name_expr,
    latitude_expr,
    longitude_expr,
    category_name_expr,
    weight_expr,
    is_score_metric_expr,
    unit_expr,
    parent_join_sql,
    category_table_name
  );
END $do$;

COMMENT ON VIEW public.v_region_metric_scores IS
  '머묾 추천 계산용 지표 점수 View. v1.2.1: parent_region_name_ko, full_region_name_ko, naver map 검색용 지역 컨텍스트 보완.';

COMMIT;
