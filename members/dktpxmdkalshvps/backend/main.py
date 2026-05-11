"""
머묾 MVP FastAPI
Supabase anon key + RLS select 기반 공개 시연용 백엔드

프론트엔드(Vite)는 5173 포트, 백엔드(FastAPI)는 8000 포트에서 실행하는 구성을 기본으로 합니다.
"""

from __future__ import annotations

import math
import os
from collections import defaultdict
from typing import Any
from urllib.parse import quote

from pydantic import BaseModel, Field

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://flqsagpixjplyblqhlph.supabase.co").rstrip("/")
SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscXNhZ3BpeGpwbHlibHFobHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjU0NDAsImV4cCI6MjA5MjgwMTQ0MH0.6k1xoHWJZn8NA96FQmtB5R0wpx2OJAJbcQNZHiKa_dU",
)
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "8000"))

# 쉼표로 추가 가능: FRONTEND_ORIGINS=http://localhost:5173,http://172.30.1.53:5173
DEFAULT_FRONTEND_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,http://172.30.1.53:5173"
FRONTEND_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.getenv("FRONTEND_ORIGINS", DEFAULT_FRONTEND_ORIGINS).split(",")
    if origin.strip()
]

HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
}


def build_admin_headers(extra: dict[str, str] | None = None) -> dict[str, str]:
    """쓰기 작업용 service_role 헤더를 생성한다."""
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=500,
            detail=(
                "SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다. "
                "dry_run 계산은 가능하지만 DB 반영(apply=true)은 service_role key가 필요합니다."
            ),
        )
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


# ──────────────────────────────────────────────
# 추천 계산용 카테고리 / 프리셋 정의
# ──────────────────────────────────────────────
CATEGORY_IDS = ("traffic", "culture", "convenience", "safety", "nature")

# Supabase 추천 조회용 View select 목록.
# v1.2.1에서는 시군구 지도 검색 정확도를 위해 parent/full region 필드를 우선 사용합니다.
# 아직 DB View를 배포하지 않은 환경에서도 API가 죽지 않도록 legacy select로 fallback합니다.
SCORE_SELECT_BASE = (
    "region_id,region_name_ko,region_level,"
    "category_id,category_name_ko,"
    "metric_id,metric_name_ko,default_weight,is_score_metric,"
    "raw_value,normalized_value,score_100,unit"
)

SCORE_SELECT_WITH_REGION_CONTEXT = (
    "region_id,region_name_ko,region_name_en,region_level,"
    "parent_region_id,parent_region_name_ko,full_region_name_ko,"
    "latitude,longitude,"
    "category_id,category_name_ko,"
    "metric_id,metric_name_ko,default_weight,is_score_metric,"
    "raw_value,normalized_value,score_100,unit"
)

REGION_SELECT_WITH_CONTEXT = (
    "region_id,region_level,region_name_ko,region_name_en,"
    "parent_region_id,latitude,longitude,population,area_km2"
)

REGION_SELECT_BASE = "region_id,region_level,region_name_ko,latitude,longitude,population,area_km2"

CATEGORY_META: dict[str, dict[str, str]] = {
    "traffic": {
        "name_ko": "교통",
        "name_en": "Traffic",
        "reason": "버스·철도 접근성이 좋아 이동 편의성이 높습니다.",
    },
    "culture": {
        "name_ko": "문화·여가·디지털",
        "name_en": "Culture, Leisure & Digital",
        "reason": "숙박·문화·통신·여가 인프라가 좋아 장기 체류에 유리합니다.",
    },
    "convenience": {
        "name_ko": "생활편의",
        "name_en": "Daily Convenience",
        "reason": "의료·약국·생활 인프라 접근성이 좋아 장기간 머물기 편합니다.",
    },
    "safety": {
        "name_ko": "안전",
        "name_en": "Safety",
        "reason": "지역안전지수 기반 안전성이 높아 안정적인 체류에 적합합니다.",
    },
    "nature": {
        "name_ko": "자연",
        "name_en": "Nature",
        "reason": "기후·녹지·대기질 등 자연환경 지표가 좋아 쾌적합니다.",
    },
}

# 21개 지표별 기본 점수화 규칙.
# DB/stg 원천에 direction 또는 normalization_method가 있으면 그 값을 우선 사용하고,
# 누락된 경우 아래 기준을 fallback으로 사용합니다.
METRIC_SCORE_RULES: dict[str, dict[str, Any]] = {
    "bus_accessibility": {"category_id": "traffic", "direction": "higher_is_better", "normalization_method": "min_max", "is_score_metric": True},
    "rail_accessibility": {"category_id": "traffic", "direction": "higher_is_better", "normalization_method": "min_max", "is_score_metric": True},
    "tourism_accommodation": {"category_id": "culture", "direction": "higher_is_better", "normalization_method": "min_max", "is_score_metric": True},
    "five_g_speed": {"category_id": "culture", "direction": "higher_is_better", "normalization_method": "min_max", "is_score_metric": True},
    "culture_facility": {"category_id": "culture", "direction": "higher_is_better", "normalization_method": "min_max", "is_score_metric": True},
    "public_wifi": {"category_id": "culture", "direction": "higher_is_better", "normalization_method": "min_max", "is_score_metric": True},
    "urban_park": {"category_id": "culture", "direction": "higher_is_better", "normalization_method": "min_max", "is_score_metric": True},
    "foreign_resident": {"category_id": "culture", "direction": "higher_is_better", "normalization_method": "log_min_max", "is_score_metric": True},
    "hospital_accessibility": {"category_id": "convenience", "direction": "higher_is_better", "normalization_method": "min_max", "is_score_metric": True},
    "pharmacy_accessibility": {"category_id": "convenience", "direction": "higher_is_better", "normalization_method": "min_max", "is_score_metric": True},
    "medical_capacity": {"category_id": "convenience", "direction": "correction", "normalization_method": "correction", "is_score_metric": True},
    "medical_operation": {"category_id": "convenience", "direction": "correction", "normalization_method": "correction", "is_score_metric": True},
    "local_commerce": {"category_id": "convenience", "direction": "higher_is_better", "normalization_method": "min_max", "is_score_metric": True},
    "police_accessibility": {"category_id": "convenience", "direction": "higher_is_better", "normalization_method": "min_max", "is_score_metric": True},
    "admin_facility": {"category_id": "convenience", "direction": "higher_is_better", "normalization_method": "min_max", "is_score_metric": True},
    "safety_index": {"category_id": "safety", "direction": "lower_is_better", "normalization_method": "reverse_min_max", "is_score_metric": True},
    "temperature": {"category_id": "nature", "direction": "range_is_better", "normalization_method": "range_score", "is_score_metric": True},
    "green_ratio": {"category_id": "nature", "direction": "higher_is_better", "normalization_method": "min_max", "is_score_metric": True},
    "pm10": {"category_id": "nature", "direction": "lower_is_better", "normalization_method": "reverse_min_max", "is_score_metric": True},
    "ozone": {"category_id": "nature", "direction": "lower_is_better", "normalization_method": "reverse_min_max", "is_score_metric": True},
    "population_density": {"category_id": "auxiliary", "direction": "correction", "normalization_method": "correction", "is_score_metric": False},
}

ALLOWED_SCORE_SOURCE_TABLES = {
    "stg_region_metric_values",
    "region_metric_values_source",
}

# 사용자가 제공한 장기체류관광 중심 프리셋 가중치.
# 모든 가중치는 합계 1.0 기준이며, 사용자 직접 입력값은 서버에서 자동 정규화합니다.
PRESET_WEIGHTS: dict[str, dict[str, Any]] = {
    "default": {
        "preset_id": "default",
        "preset_name_ko": "기본값",
        "preset_name_en": "Default",
        "description": "장기체류관광 기본 권장값",
        "weights": {
            "traffic": 0.15,
            "culture": 0.25,
            "convenience": 0.28,
            "safety": 0.17,
            "nature": 0.15,
        },
    },
    "foreign_tourist": {
        "preset_id": "foreign_tourist",
        "preset_name_ko": "해외 관광객",
        "preset_name_en": "Foreign Tourist",
        "description": "여가·관광·문화 및 통신 중시",
        "weights": {
            "traffic": 0.10,
            "culture": 0.30,
            "convenience": 0.25,
            "safety": 0.18,
            "nature": 0.17,
        },
    },
    "remote_worker": {
        "preset_id": "remote_worker",
        "preset_name_ko": "원격근무자",
        "preset_name_en": "Remote Worker",
        "description": "통신·의료·생활 인프라 중시",
        "weights": {
            "traffic": 0.18,
            "culture": 0.22,
            "convenience": 0.30,
            "safety": 0.15,
            "nature": 0.15,
        },
    },
    "active_senior": {
        "preset_id": "active_senior",
        "preset_name_ko": "액티브 시니어",
        "preset_name_en": "Active Senior",
        "description": "문화·자연·의료 중시",
        "weights": {
            "traffic": 0.12,
            "culture": 0.28,
            "convenience": 0.25,
            "safety": 0.15,
            "nature": 0.20,
        },
    },
    "culture_single_couple": {
        "preset_id": "culture_single_couple",
        "preset_name_ko": "부부/1인 문화생활",
        "preset_name_en": "Culture Lifestyle",
        "description": "문화·여가 최고 우선",
        "weights": {
            "traffic": 0.15,
            "culture": 0.32,
            "convenience": 0.23,
            "safety": 0.12,
            "nature": 0.18,
        },
    },
}


class RecommendationRequest(BaseModel):
    """추천 계산 요청 모델"""

    preset_id: str | None = Field(
        default="default",
        description="사용할 프리셋 ID. weights가 없으면 preset_id 기준 가중치를 사용합니다.",
    )
    weights: dict[str, float] | None = Field(
        default=None,
        description="사용자 직접 가중치. 0~1 또는 0~100 모두 허용하며 서버에서 자동 정규화합니다.",
    )
    limit: int = Field(default=5, ge=1, le=50, description="반환할 추천 지역 개수")
    region_level: str = Field(
        default="sido",
        pattern="^(sido|sigungu)$",
        description="추천 대상 지역 단위. sido 또는 sigungu",
    )


class ScoreCalculationRequest(BaseModel):
    """stg/원천형 테이블의 raw_value를 기반으로 지표 점수를 재계산하는 요청 모델"""

    region_level: str = Field(default="sigungu", pattern="^(sido|sigungu)$", description="계산 대상 지역 단위")
    source_table: str = Field(
        default="stg_region_metric_values",
        pattern="^[A-Za-z_][A-Za-z0-9_]*$",
        description="raw_value 또는 cleaned_value가 들어 있는 stg 테이블명",
    )
    version_id: str | None = Field(default=None, description="반영 시 사용할 data_versions.version_id. 없으면 active 버전 사용")
    metric_ids: list[str] | None = Field(default=None, description="일부 지표만 재계산할 때 지정")
    apply: bool = Field(default=False, description="true이면 계산 결과를 region_metric_values에 저장")
    replace_existing: bool = Field(default=False, description="apply=true일 때 같은 version/region/metric 기존 행 삭제 후 삽입")
    limit: int = Field(default=10000, ge=1, le=50000, description="Supabase에서 가져올 최대 원천 행 수")
    preview_limit: int = Field(default=20, ge=0, le=200, description="응답에 포함할 미리보기 행 수")
    normalization_options: dict[str, dict[str, float]] | None = Field(
        default=None,
        description=(
            "range_score 등 특수 지표 옵션. 예: "
            "{\"temperature\": {\"ideal_min\": 18, \"ideal_max\": 24}}"
        ),
    )


def preset_to_response(preset: dict[str, Any]) -> dict[str, Any]:
    """프론트엔드가 쓰기 쉬운 형태로 프리셋을 변환"""
    weights = preset["weights"]
    return {
        "preset_id": preset["preset_id"],
        "preset_name_ko": preset["preset_name_ko"],
        "preset_name_en": preset["preset_name_en"],
        "description": preset["description"],
        "traffic_weight": weights["traffic"],
        "culture_weight": weights["culture"],
        "convenience_weight": weights["convenience"],
        "safety_weight": weights["safety"],
        "nature_weight": weights["nature"],
        "weights": weights,
    }


def resolve_weights(preset_id: str | None, weights: dict[str, float] | None) -> tuple[str, dict[str, float]]:
    """프리셋 또는 직접 입력 가중치를 서버 계산용 정규화 가중치로 변환"""
    if weights:
        raw_weights = {
            category_id: float(weights.get(category_id, 0) or 0)
            for category_id in CATEGORY_IDS
        }
        resolved_preset_id = preset_id or "custom"
    else:
        resolved_preset_id = preset_id or "default"
        if resolved_preset_id not in PRESET_WEIGHTS:
            valid = ", ".join(PRESET_WEIGHTS.keys())
            raise HTTPException(
                status_code=400,
                detail=f"알 수 없는 preset_id입니다: {resolved_preset_id}. 사용 가능: {valid}",
            )
        raw_weights = dict(PRESET_WEIGHTS[resolved_preset_id]["weights"])

    total = sum(value for value in raw_weights.values() if value > 0)
    if total <= 0:
        raw_weights = dict(PRESET_WEIGHTS["default"]["weights"])
        total = sum(raw_weights.values())
        resolved_preset_id = "default"

    normalized = {
        category_id: round(max(raw_weights.get(category_id, 0), 0) / total, 6)
        for category_id in CATEGORY_IDS
    }
    return resolved_preset_id, normalized


def calc_average(values: list[float]) -> float:
    return round(sum(values) / len(values), 2) if values else 0.0


def to_float(value: Any) -> float | None:
    """문자열/숫자 원천값을 안전하게 float로 변환한다."""
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    try:
        if isinstance(value, str):
            cleaned = value.strip().replace(",", "")
            if cleaned == "" or cleaned.lower() in {"nan", "none", "null"}:
                return None
            return float(cleaned)
        result = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(result):
        return None
    return result


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def boolish(value: Any, default: bool = True) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value).strip().lower() in {"true", "t", "1", "yes", "y"}


def metric_rule_for(row: dict[str, Any], metrics_meta: dict[str, dict[str, Any]] | None = None) -> dict[str, Any]:
    """행/metrics 메타데이터/기본 규칙을 합쳐 점수화 규칙을 결정한다."""
    metric_id = str(row.get("metric_id") or "")
    base = dict(METRIC_SCORE_RULES.get(metric_id, {}))
    if metrics_meta and metric_id in metrics_meta:
        base.update({k: v for k, v in metrics_meta[metric_id].items() if v is not None})

    if row.get("category_id") is not None:
        base["category_id"] = row.get("category_id")
    if row.get("direction"):
        base["direction"] = row.get("direction")
    if row.get("normalization_method"):
        base["normalization_method"] = row.get("normalization_method")
    elif row.get("normalization"):
        base["normalization_method"] = row.get("normalization")
    if row.get("is_score_metric") is not None:
        base["is_score_metric"] = boolish(row.get("is_score_metric"), default=True)

    base.setdefault("category_id", row.get("category_id"))
    base.setdefault("direction", "higher_is_better")
    base.setdefault("normalization_method", "min_max")
    base.setdefault("is_score_metric", base.get("category_id") != "auxiliary")
    return base


def normalize_one_value(
    value: float,
    values_for_metric: list[float],
    rule: dict[str, Any],
    options: dict[str, float] | None = None,
) -> float | None:
    """단일 raw/cleaned value를 0~1 normalized_value로 변환한다."""
    if not rule.get("is_score_metric", True):
        return None

    method = str(rule.get("normalization_method") or "min_max")
    direction = str(rule.get("direction") or "higher_is_better")
    options = options or {}

    if method == "correction" or direction == "correction":
        # 보정용 지표는 추천 점수 평균에는 포함하지 않는다.
        return None

    transformed_value = value
    transformed_values = list(values_for_metric)
    if method == "log_min_max":
        transformed_value = math.log1p(max(value, 0.0))
        transformed_values = [math.log1p(max(v, 0.0)) for v in values_for_metric]

    if method == "range_score" or direction == "range_is_better":
        if not transformed_values:
            return None
        min_value = min(transformed_values)
        max_value = max(transformed_values)
        if max_value == min_value:
            return 1.0

        ideal_min = options.get("ideal_min")
        ideal_max = options.get("ideal_max")
        if ideal_min is not None and ideal_max is not None:
            if ideal_min <= value <= ideal_max:
                return 1.0
            if value < ideal_min:
                denom = ideal_min - min_value
                return clamp01(1.0 if denom == 0 else 1 - ((ideal_min - value) / denom))
            denom = max_value - ideal_max
            return clamp01(1.0 if denom == 0 else 1 - ((value - ideal_max) / denom))

        midpoint = (min_value + max_value) / 2
        half_range = (max_value - min_value) / 2
        return clamp01(1.0 - abs(value - midpoint) / half_range) if half_range else 1.0

    min_value = min(transformed_values)
    max_value = max(transformed_values)
    if max_value == min_value:
        return 1.0

    if method == "reverse_min_max" or direction == "lower_is_better":
        return clamp01((max_value - transformed_value) / (max_value - min_value))

    return clamp01((transformed_value - min_value) / (max_value - min_value))


def calculate_metric_scores_from_rows(
    rows: list[dict[str, Any]],
    metrics_meta: dict[str, dict[str, Any]] | None = None,
    normalization_options: dict[str, dict[str, float]] | None = None,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """원천 rows의 cleaned_value/raw_value를 metric_id별로 0~100 점수화한다."""
    metrics_meta = metrics_meta or {}
    normalization_options = normalization_options or {}
    grouped: dict[str, list[tuple[dict[str, Any], float]]] = defaultdict(list)
    invalid_rows: list[dict[str, Any]] = []

    for row in rows:
        value = to_float(row.get("cleaned_value", row.get("raw_value")))
        if value is None:
            invalid_rows.append(row)
            continue
        grouped[str(row.get("metric_id"))].append((row, value))

    computed: list[dict[str, Any]] = []
    metric_summaries: dict[str, dict[str, Any]] = {}

    for metric_id, metric_rows in sorted(grouped.items()):
        values = [value for _, value in metric_rows]
        first_rule = metric_rule_for(metric_rows[0][0], metrics_meta)
        options = normalization_options.get(metric_id, {})

        non_null_scores = 0
        for row, value in metric_rows:
            rule = metric_rule_for(row, metrics_meta)
            normalized = normalize_one_value(value, values, rule, options)
            score_100 = round(normalized * 100, 2) if normalized is not None else None
            if score_100 is not None:
                non_null_scores += 1

            computed_row = dict(row)
            computed_row["cleaned_value"] = value
            computed_row["category_id"] = rule.get("category_id") or computed_row.get("category_id")
            computed_row["direction"] = rule.get("direction")
            computed_row["normalization_method"] = rule.get("normalization_method")
            computed_row["is_score_metric"] = rule.get("is_score_metric", True)
            computed_row["normalized_value"] = round(normalized, 6) if normalized is not None else None
            computed_row["score_100"] = score_100
            computed.append(computed_row)

        metric_summaries[metric_id] = {
            "row_count": len(metric_rows),
            "valid_value_count": len(values),
            "score_count": non_null_scores,
            "min_cleaned_value": min(values) if values else None,
            "max_cleaned_value": max(values) if values else None,
            "direction": first_rule.get("direction"),
            "normalization_method": first_rule.get("normalization_method"),
            "is_score_metric": first_rule.get("is_score_metric", True),
        }

    computed.sort(key=lambda item: (str(item.get("region_id")), str(item.get("metric_id"))))
    summary = {
        "input_rows": len(rows),
        "computed_rows": len(computed),
        "invalid_value_rows": len(invalid_rows),
        "metric_count": len(metric_summaries),
        "metrics": metric_summaries,
    }
    return computed, summary


def rows_for_region_metric_values(
    computed_rows: list[dict[str, Any]],
    version_id: str | None,
    version_column: str | None = "version_id",
) -> list[dict[str, Any]]:
    """region_metric_values 저장용 payload를 생성한다."""
    payload = []
    for row in computed_rows:
        item = {
            "region_id": str(row.get("region_id")),
            "metric_id": row.get("metric_id"),
            "raw_value": row.get("raw_value"),
            "normalized_value": row.get("normalized_value"),
            "score_100": row.get("score_100"),
        }
        if version_id and version_column:
            item[version_column] = version_id
        for optional_key in (
            "cleaned_value",
            "unit",
            "source_file",
            "direction",
            "normalization_method",
            "imputation_method",
            "is_outlier",
        ):
            if optional_key in row:
                item[optional_key] = row.get(optional_key)
        payload.append(item)
    return payload


def build_full_region_name(row: dict[str, Any]) -> str:
    """시군구는 '시도명 + 시군구명', 시도는 '시도명'으로 지도 검색어를 만든다."""
    full_region_name = (row.get("full_region_name_ko") or row.get("fullRegionNameKo") or "").strip()
    if full_region_name:
        return full_region_name

    level = row.get("region_level") or row.get("level")
    region_name = (row.get("region_name_ko") or row.get("regionNameKo") or "").strip()
    parent_name = (row.get("parent_region_name_ko") or row.get("parentRegionNameKo") or "").strip()

    if level == "sigungu" and parent_name:
        return f"{parent_name} {region_name}".strip()

    return region_name


def build_naver_map(region: dict[str, Any]) -> dict[str, str]:
    """네이버지도 웹 URL과 모바일 앱 딥링크를 생성한다."""
    query = build_full_region_name(region)
    encoded_query = quote(query)
    return {
        "query": query,
        "webUrl": f"https://map.naver.com/p/search/{encoded_query}",
        "appUrl": f"nmap://search?query={encoded_query}&appname=meomum",
    }


def enrich_region_context(row: dict[str, Any]) -> dict[str, Any]:
    """지역명/상위 시도명/네이버지도 필드를 snake_case와 camelCase 모두로 보강한다."""
    enriched = dict(row)
    full_region_name = build_full_region_name(enriched)
    parent_name = enriched.get("parent_region_name_ko")

    enriched.setdefault("full_region_name_ko", full_region_name)
    enriched["regionId"] = enriched.get("region_id")
    enriched["regionNameKo"] = enriched.get("region_name_ko")
    enriched["regionNameEn"] = enriched.get("region_name_en")
    enriched["parentRegionId"] = enriched.get("parent_region_id")
    enriched["parentRegionNameKo"] = parent_name
    enriched["fullRegionNameKo"] = full_region_name
    enriched["level"] = enriched.get("region_level")
    enriched["naverMap"] = build_naver_map(enriched)
    return enriched


def make_reasons(category_scores: dict[str, float], max_items: int = 3) -> list[str]:
    """상위 카테고리 기반 추천 이유 생성"""
    top_categories = sorted(
        category_scores.items(),
        key=lambda item: item[1],
        reverse=True,
    )[:max_items]

    reasons = []
    for category_id, score in top_categories:
        if score <= 0:
            continue
        meta = CATEGORY_META.get(category_id, {})
        reasons.append(meta.get("reason", f"{category_id} 점수가 높아 현재 조건에 적합합니다."))
    return reasons

app = FastAPI(
    title="머묾 MVP API",
    description="Supabase anon key + RLS select 기반 지역 추천 API",
    version="1.2.1",
)

# Vite 개발 서버(5173)에서 FastAPI(8000)로 요청할 수 있도록 CORS 허용.
# localhost, 127.0.0.1, 사설 IP(10.*, 172.*, 192.168.*) 개발 주소를 함께 허용합니다.
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_origin_regex=(
        r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|"
        r"10\.\d+\.\d+\.\d+|172\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+):\d+"
    ),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def supa_get(path: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]] | dict[str, Any]:
    """Supabase REST API GET 헬퍼"""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_URL 또는 SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다.",
        )

    url = f"{SUPABASE_URL}/rest/v1/{path.lstrip('/')}"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=HEADERS, params=params)
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Supabase 연결 실패: {exc}",
        ) from exc

    if resp.status_code >= 400:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Supabase 오류: {resp.text[:300]}",
        )

    return resp.json()




async def supa_get_admin(path: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]] | dict[str, Any]:
    """Supabase REST API GET helper using service_role.

    Admin/source calculation endpoints must read staging tables with service_role,
    because stg_* tables are often not readable by the anon role due to RLS/grants.
    """
    if not SUPABASE_URL:
        raise HTTPException(status_code=500, detail="SUPABASE_URL 환경변수가 설정되지 않았습니다.")

    url = f"{SUPABASE_URL}/rest/v1/{path.lstrip('/')}"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url, headers=build_admin_headers(), params=params)
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Supabase 관리자 조회 연결 실패: {exc}") from exc

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=f"Supabase 관리자 조회 오류: {resp.text[:500]}")

    return resp.json()


async def supa_post(
    path: str,
    payload: list[dict[str, Any]] | dict[str, Any],
    params: dict[str, Any] | None = None,
    prefer: str | None = None,
) -> list[dict[str, Any]] | dict[str, Any]:
    """Supabase REST API POST 헬퍼. 쓰기 작업은 service_role key를 사용한다."""
    url = f"{SUPABASE_URL}/rest/v1/{path.lstrip('/')}"
    extra_headers = {"Prefer": prefer} if prefer else None
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                url,
                headers=build_admin_headers(extra_headers),
                params=params,
                json=payload,
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Supabase 쓰기 연결 실패: {exc}") from exc

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=f"Supabase 쓰기 오류: {resp.text[:500]}")
    return resp.json() if resp.content else {}


async def supa_delete(
    path: str,
    params: dict[str, Any],
) -> list[dict[str, Any]] | dict[str, Any]:
    """Supabase REST API DELETE 헬퍼. 쓰기 작업은 service_role key를 사용한다."""
    url = f"{SUPABASE_URL}/rest/v1/{path.lstrip('/')}"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.delete(
                url,
                headers=build_admin_headers({"Prefer": "return=representation"}),
                params=params,
            )
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Supabase 삭제 연결 실패: {exc}") from exc

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=f"Supabase 삭제 오류: {resp.text[:500]}")
    return resp.json() if resp.content else {}


async def get_active_version_id() -> str | None:
    result = await supa_get(
        "data_versions",
        params={
            "select": "version_id",
            "status": "eq.active",
            "order": "published_at.desc.nullslast,version_id.desc",
            "limit": "1",
        },
    )
    if isinstance(result, list) and result:
        return result[0].get("version_id")
    return None


async def get_metrics_metadata() -> dict[str, dict[str, Any]]:
    """metrics 테이블의 점수화 메타데이터를 가져오되, 컬럼 차이는 fallback한다."""
    select_candidates = [
        "metric_id,category_id,direction,normalization,normalization_method,is_score_metric,unit",
        "metric_id,category_id,direction,normalization,unit",
        "metric_id,category_id,direction,unit",
        "metric_id,category_id",
    ]
    data: list[dict[str, Any]] = []
    for select in select_candidates:
        try:
            result = await supa_get("metrics", params={"select": select, "limit": "1000"})
            data = result if isinstance(result, list) else []
            break
        except HTTPException as exc:
            if exc.status_code not in {400, 404}:
                raise
    meta = {metric_id: dict(rule) for metric_id, rule in METRIC_SCORE_RULES.items()}
    for row in data:
        metric_id = row.get("metric_id")
        if not metric_id:
            continue
        merged = dict(meta.get(metric_id, {}))
        if row.get("normalization") and not row.get("normalization_method"):
            row["normalization_method"] = row.get("normalization")
        merged.update({k: v for k, v in row.items() if v is not None})
        meta[str(metric_id)] = merged
    return meta


async def get_region_metric_scores_from_view(params: dict[str, Any]) -> list[dict[str, Any]]:
    """v_region_metric_scores 조회. v1.2.1 View가 없으면 기존 View select로 fallback한다."""
    enhanced_params = dict(params)
    enhanced_params["select"] = SCORE_SELECT_WITH_REGION_CONTEXT
    try:
        result = await supa_get("v_region_metric_scores", params=enhanced_params)
        return result if isinstance(result, list) else []
    except HTTPException as exc:
        # 신규 컬럼 배포 전 환경에서는 PostgREST가 400/404를 반환할 수 있으므로 legacy 조회를 허용합니다.
        if exc.status_code not in {400, 404}:
            raise

    legacy_params = dict(params)
    legacy_params["select"] = SCORE_SELECT_BASE
    result = await supa_get("v_region_metric_scores", params=legacy_params)
    return result if isinstance(result, list) else []


@app.get("/", summary="API 상태")
@app.get("/api", include_in_schema=False)
async def root():
    return {
        "service": "머묾 MVP API",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "recommendations": "/recommendations",
        "recommendation_presets": "/recommendations/presets",
        "api_prefix_supported": True,
    }


# ──────────────────────────────────────────────
# 1. 지역 목록 조회
# ──────────────────────────────────────────────
@app.get(
    "/regions",
    summary="지역 목록 조회",
    description="활성화된 시도(sido) 또는 시군구(sigungu) 목록을 반환합니다.",
)
@app.get("/api/regions", include_in_schema=False)
@app.get("/api/v1/regions", include_in_schema=False)
async def get_regions(
    region_level: str = Query("sido", pattern="^(sido|sigungu)$", description="sido | sigungu"),
):
    params = {
        "select": REGION_SELECT_WITH_CONTEXT,
        "is_active": "eq.true",
        "region_level": f"eq.{region_level}",
        "order": "region_id.asc",
    }
    try:
        data = await supa_get("regions", params=params)
    except HTTPException as exc:
        if exc.status_code not in {400, 404}:
            raise
        params["select"] = REGION_SELECT_BASE
        data = await supa_get("regions", params=params)

    enriched = [enrich_region_context(row) for row in data]
    return {"count": len(enriched), "regions": enriched}


# ──────────────────────────────────────────────
# 2. 지표 점수 조회 (v_region_metric_scores 전체)
# ──────────────────────────────────────────────
@app.get(
    "/scores",
    summary="전체 지표 점수 조회",
    description=(
        "is_score_metric=true인 본지표의 전 지역 점수를 반환합니다. "
        "추천 계산은 /recommendations API에서 서버 기준으로도 수행할 수 있습니다."
    ),
)
@app.get("/api/scores", include_in_schema=False)
@app.get("/api/v1/scores", include_in_schema=False)
async def get_scores(
    region_level: str | None = Query(default=None, pattern="^(sido|sigungu)$", description="선택 시 해당 지역 단위만 조회"),
):
    params = {
        "is_score_metric": "eq.true",
        "order": "region_id.asc,category_id.asc",
        "limit": "5000",
    }
    if region_level:
        params["region_level"] = f"eq.{region_level}"
    data = await get_region_metric_scores_from_view(params)
    enriched = [enrich_region_context(row) for row in data]
    return {"count": len(enriched), "scores": enriched}


# ──────────────────────────────────────────────
# 3. 지역 상세 보기 (region_id 필터)
# ──────────────────────────────────────────────
@app.get(
    "/scores/{region_id}",
    summary="지역 상세 점수 조회",
    description="특정 지역의 전 지표 raw_value + score_100을 반환합니다.",
)
@app.get("/api/scores/{region_id}", include_in_schema=False)
@app.get("/api/v1/scores/{region_id}", include_in_schema=False)
@app.get("/api/v1/regions/{region_id}/details", include_in_schema=False)
async def get_region_scores(region_id: str):
    data = await get_region_metric_scores_from_view(
        {
            "region_id": f"eq.{region_id}",
            "order": "category_id.asc,metric_id.asc",
        }
    )
    if not data:
        raise HTTPException(status_code=404, detail=f"region_id '{region_id}' 없음")

    cats: dict[str, dict[str, Any]] = {}
    for row in data:
        category_id = row["category_id"]
        cats.setdefault(
            category_id,
            {"category_name_ko": row["category_name_ko"], "metrics": []},
        )
        cats[category_id]["metrics"].append(row)

    enriched_rows = [enrich_region_context(row) for row in data]
    region_context = enrich_region_context(data[0])

    return {
        "region_id": region_id,
        "region_name_ko": data[0]["region_name_ko"],
        "regionId": region_context.get("regionId"),
        "regionNameKo": region_context.get("regionNameKo"),
        "regionNameEn": region_context.get("regionNameEn"),
        "region_level": region_context.get("region_level"),
        "level": region_context.get("level"),
        "parent_region_id": region_context.get("parent_region_id"),
        "parent_region_name_ko": region_context.get("parent_region_name_ko"),
        "parentRegionId": region_context.get("parentRegionId"),
        "parentRegionNameKo": region_context.get("parentRegionNameKo"),
        "full_region_name_ko": region_context.get("full_region_name_ko"),
        "fullRegionNameKo": region_context.get("fullRegionNameKo"),
        "naverMap": region_context.get("naverMap"),
        "categories": cats,
        "raw": enriched_rows,
    }


# ──────────────────────────────────────────────
# 4. 프리셋 조회
# ──────────────────────────────────────────────
@app.get(
    "/presets",
    summary="추천 프리셋 조회",
    description="서버 기준 프리셋 가중치 목록을 반환합니다.",
)
@app.get("/api/presets", include_in_schema=False)
@app.get("/api/v1/presets", include_in_schema=False)
@app.get("/recommendations/presets", include_in_schema=False)
@app.get("/api/recommendations/presets", include_in_schema=False)
@app.get("/api/v1/recommendations/presets", include_in_schema=False)
async def get_presets():
    presets = [preset_to_response(preset) for preset in PRESET_WEIGHTS.values()]
    return {"count": len(presets), "presets": presets}



# ──────────────────────────────────────────────
# 5. 서버 추천 계산
# ──────────────────────────────────────────────
@app.post(
    "/recommendations",
    summary="추천 랭킹 산출",
    description=(
        "preset_id 또는 사용자 직접 weights를 받아 FastAPI 서버에서 "
        "카테고리 점수, finalScore, Top N 추천 지역을 계산합니다."
    ),
)
@app.post("/api/recommendations", include_in_schema=False)
@app.post("/api/v1/recommendations", include_in_schema=False)
async def get_recommendations(request: RecommendationRequest):
    resolved_preset_id, weights = resolve_weights(request.preset_id, request.weights)

    data = await get_region_metric_scores_from_view(
        {
            "is_score_metric": "eq.true",
            "region_level": f"eq.{request.region_level}",
            "order": "region_id.asc,category_id.asc",
            "limit": "5000",
        }
    )

    if not data:
        return {
            "preset_id": resolved_preset_id,
            "weights": weights,
            "count": 0,
            "recommendations": [],
            "message": "추천 계산에 사용할 점수 데이터가 없습니다.",
        }

    region_map: dict[str, dict[str, Any]] = {}

    for row in data:
        region_id = str(row.get("region_id"))
        category_id = row.get("category_id")
        score = row.get("score_100")

        if category_id not in CATEGORY_IDS or score is None:
            continue

        region = region_map.setdefault(
            region_id,
            {
                "region_id": region_id,
                "region_name_ko": row.get("region_name_ko"),
                "region_name_en": row.get("region_name_en"),
                "region_level": row.get("region_level"),
                "parent_region_id": row.get("parent_region_id"),
                "parent_region_name_ko": row.get("parent_region_name_ko"),
                "full_region_name_ko": build_full_region_name(row),
                "latitude": row.get("latitude"),
                "longitude": row.get("longitude"),
                "category_values": {category_id: [] for category_id in CATEGORY_IDS},
                "metric_count": 0,
            },
        )

        try:
            region["category_values"][category_id].append(float(score))
            region["metric_count"] += 1
        except (TypeError, ValueError):
            continue

    recommendations: list[dict[str, Any]] = []

    for region in region_map.values():
        category_scores = {
            category_id: calc_average(region["category_values"].get(category_id, []))
            for category_id in CATEGORY_IDS
        }

        final_score = round(
            sum(category_scores[category_id] * weights.get(category_id, 0) for category_id in CATEGORY_IDS),
            2,
        )

        missing_categories = [
            category_id
            for category_id, values in region["category_values"].items()
            if not values
        ]

        region_context = enrich_region_context(region)
        recommendations.append(
            {
                "region_id": region["region_id"],
                "region_name_ko": region["region_name_ko"],
                "region_name_en": region.get("region_name_en"),
                "region_level": region["region_level"],
                "parent_region_id": region.get("parent_region_id"),
                "parent_region_name_ko": region.get("parent_region_name_ko"),
                "full_region_name_ko": region_context.get("full_region_name_ko"),
                "latitude": region.get("latitude"),
                "longitude": region.get("longitude"),
                "regionId": region_context.get("regionId"),
                "regionNameKo": region_context.get("regionNameKo"),
                "regionNameEn": region_context.get("regionNameEn"),
                "level": region_context.get("level"),
                "parentRegionId": region_context.get("parentRegionId"),
                "parentRegionNameKo": region_context.get("parentRegionNameKo"),
                "fullRegionNameKo": region_context.get("fullRegionNameKo"),
                "naverMap": region_context.get("naverMap"),
                "finalScore": final_score,
                "final_score": final_score,
                "category_scores": category_scores,
                "categoryScores": category_scores,
                "reasons": make_reasons(category_scores),
                "score_metric_count": region["metric_count"],
                "missing_categories": missing_categories,
            }
        )

    recommendations = sorted(
        recommendations,
        key=lambda item: (
            item["finalScore"],
            item["category_scores"].get("convenience", 0),
            item["category_scores"].get("safety", 0),
            item["category_scores"].get("culture", 0),
        ),
        reverse=True,
    )[: request.limit]

    for index, item in enumerate(recommendations, start=1):
        item["rank"] = index

    return {
        "preset_id": resolved_preset_id,
        "preset": (
            preset_to_response(PRESET_WEIGHTS[resolved_preset_id])
            if resolved_preset_id in PRESET_WEIGHTS
            else None
        ),
        "weights": weights,
        "count": len(recommendations),
        "recommendations": recommendations,
    }


# ──────────────────────────────────────────────
# 6. 원천/stg 기반 지표 점수 재계산
# ──────────────────────────────────────────────
@app.post(
    "/score-calculations/region-metrics",
    summary="원천/stg 기반 지역 지표 점수 재계산",
    description=(
        "stg_region_metric_values 같은 원천형 테이블의 raw_value/cleaned_value를 metric_id별로 "
        "min-max, reverse min-max, log min-max, range score 방식으로 재계산합니다. "
        "기본은 dry-run이며 apply=true일 때만 region_metric_values에 저장합니다."
    ),
)
@app.post("/api/score-calculations/region-metrics", include_in_schema=False)
@app.post("/api/v1/score-calculations/region-metrics", include_in_schema=False)
@app.post("/api/v1/admin/score-calculations/region-metrics", include_in_schema=False)
async def calculate_region_metric_scores(request: ScoreCalculationRequest):
    if request.source_table not in ALLOWED_SCORE_SOURCE_TABLES and not request.source_table.startswith("stg_"):
        raise HTTPException(
            status_code=400,
            detail="source_table은 stg_로 시작하는 테이블 또는 허용된 원천형 테이블만 사용할 수 있습니다.",
        )

    source_select_candidates = [
        (
            "region_id,region_level,region_name,category_id,metric_id,raw_value,cleaned_value,"
            "unit,direction,normalization_method,imputation_method,is_outlier,source_file"
        ),
        "region_id,region_level,category_id,metric_id,raw_value,cleaned_value",
        "region_id,region_level,category_id,metric_id,raw_value",
    ]

    # stg_* source tables are admin-only in most Supabase setups.
    # Use service_role for source reads when available; this also prevents RLS from
    # silently returning 0 rows for anon requests.
    if request.apply and not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=500,
            detail="apply=true는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.",
        )

    read_source = supa_get_admin if SUPABASE_SERVICE_ROLE_KEY else supa_get

    data: list[dict[str, Any]] = []
    last_error: HTTPException | None = None
    for select in source_select_candidates:
        params: dict[str, Any] = {
            "select": select,
            "region_level": f"eq.{request.region_level}",
            "order": "metric_id.asc,region_id.asc",
            "limit": str(request.limit),
        }
        if request.metric_ids:
            metric_list = ",".join(str(metric_id) for metric_id in request.metric_ids)
            params["metric_id"] = f"in.({metric_list})"
        try:
            result = await read_source(request.source_table, params=params)
            data = result if isinstance(result, list) else []
            last_error = None
            break
        except HTTPException as exc:
            last_error = exc
            if exc.status_code not in {400, 404}:
                raise

    if last_error is not None and not data:
        raise last_error

    if not data:
        return {
            "source_table": request.source_table,
            "region_level": request.region_level,
            "applied": False,
            "summary": {
                "input_rows": 0,
                "computed_rows": 0,
                "invalid_value_rows": 0,
                "metric_count": 0,
                "metrics": {},
            },
            "preview": [],
            "message": (
                "재계산할 원천/stg 행이 없습니다. "
                "Supabase SQL에서 SELECT count(*) FROM public.stg_region_metric_values "
                "WHERE region_level = 'sigungu'; 결과를 확인하세요. "
                "count가 있는데도 0이면 SUPABASE_SERVICE_ROLE_KEY 설정 또는 RLS/권한 문제입니다."
            ),
        }

    metrics_meta = await get_metrics_metadata()
    computed_rows, summary = calculate_metric_scores_from_rows(
        data,
        metrics_meta=metrics_meta,
        normalization_options=request.normalization_options,
    )

    response: dict[str, Any] = {
        "source_table": request.source_table,
        "region_level": request.region_level,
        "applied": False,
        "target_table": "region_metric_values" if request.apply else None,
        "summary": summary,
        "preview": computed_rows[: request.preview_limit],
    }

    if not request.apply:
        response["message"] = "dry-run 완료: 계산 결과는 DB에 저장하지 않았습니다. 저장하려면 apply=true로 호출하세요."
        return response

    version_id = request.version_id or await get_active_version_id()
    if not version_id:
        raise HTTPException(status_code=400, detail="active data_versions.version_id를 찾지 못했습니다. version_id를 직접 지정하세요.")

    version_column_candidates = ["version_id", "data_version_id", "data_version"]
    last_write_error: HTTPException | None = None
    saved_rows = 0
    inserted_chunks = 0
    used_version_column: str | None = None

    for version_column in version_column_candidates:
        payload = rows_for_region_metric_values(computed_rows, version_id=version_id, version_column=version_column)
        try:
            if request.replace_existing and payload:
                region_ids = sorted({str(row["region_id"]) for row in payload})
                metric_ids = sorted({str(row["metric_id"]) for row in payload})
                delete_params = {
                    version_column: f"eq.{version_id}",
                    "region_id": f"in.({','.join(region_ids)})",
                    "metric_id": f"in.({','.join(metric_ids)})",
                }
                await supa_delete("region_metric_values", params=delete_params)

            chunk_size = 500
            inserted_chunks = 0
            for start in range(0, len(payload), chunk_size):
                chunk = payload[start : start + chunk_size]
                await supa_post(
                    "region_metric_values",
                    chunk,
                    params={"on_conflict": f"{version_column},region_id,metric_id"},
                    prefer="resolution=merge-duplicates,return=minimal",
                )
                inserted_chunks += 1

            saved_rows = len(payload)
            used_version_column = version_column
            last_write_error = None
            break
        except HTTPException as exc:
            last_write_error = exc
            # 버전 컬럼명이 다른 스키마에서는 400 계열 오류가 날 수 있어 다음 후보를 시도한다.
            if exc.status_code not in {400, 404}:
                raise

    if last_write_error is not None or used_version_column is None:
        raise HTTPException(
            status_code=last_write_error.status_code if last_write_error else 500,
            detail=(
                "region_metric_values 반영에 실패했습니다. "
                "version_id/data_version_id/data_version 컬럼 후보가 모두 실패했습니다. "
                f"마지막 오류: {last_write_error.detail if last_write_error else 'unknown'}"
            ),
        )

    response.update(
        {
            "applied": True,
            "version_id": version_id,
            "version_column": used_version_column,
            "saved_rows": saved_rows,
            "inserted_chunks": inserted_chunks,
            "message": "계산 결과를 region_metric_values에 반영했습니다.",
        }
    )
    return response


# ──────────────────────────────────────────────
# 7. 헬스 체크
# ──────────────────────────────────────────────
@app.get("/health", include_in_schema=False)
@app.get("/api/health", include_in_schema=False)
@app.get("/api/v1/health", include_in_schema=False)
async def health():
    try:
        await supa_get("regions", params={"select": "region_id", "limit": "1"})
        return {"status": "ok", "supabase": "connected"}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=API_HOST, port=API_PORT, reload=True)
