"""
머묾 MVP FastAPI
Supabase anon key + RLS select 기반 공개 시연용 백엔드
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://flqsagpixjplyblqhlph.supabase.co")
SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscXNhZ3BpeGpwbHlibHFobHBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjU0NDAsImV4cCI6MjA5MjgwMTQ0MH0.6k1xoHWJZn8NA96FQmtB5R0wpx2OJAJbcQNZHiKa_dU",
)

HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
}

app = FastAPI(
    title="머묾 MVP API",
    description="Supabase anon key + RLS select 기반 지역 추천 API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


async def supa_get(path: str, params: dict | None = None) -> list | dict:
    """Supabase REST API GET 헬퍼"""
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=HEADERS, params=params)
    if resp.status_code >= 400:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"Supabase 오류: {resp.text[:200]}",
        )
    return resp.json()


# ──────────────────────────────────────────────
# 1. 지역 목록 조회
# ──────────────────────────────────────────────
@app.get(
    "/regions",
    summary="지역 목록 조회",
    description="활성화된 시도(sido) 목록을 반환합니다.",
)
async def get_regions(
    region_level: str = Query("sido", description="sido | sigungu"),
):
    data = await supa_get(
        "regions",
        params={
            "select": "region_id,region_level,region_name_ko,latitude,longitude,population,area_km2",
            "is_active": "eq.true",
            "region_level": f"eq.{region_level}",
            "order": "region_id.asc",
        },
    )
    return {"count": len(data), "regions": data}


# ──────────────────────────────────────────────
# 2. 지표 점수 조회 (v_region_metric_scores 전체)
# ──────────────────────────────────────────────
@app.get(
    "/scores",
    summary="전체 지표 점수 조회",
    description="is_score_metric=true인 20개 본지표의 전 지역 점수를 반환합니다. "
                "프론트에서 카테고리 평균·finalScore·TOP5를 JS로 계산합니다.",
)
async def get_scores():
    data = await supa_get(
        "v_region_metric_scores",
        params={
            "select": "region_id,region_name_ko,region_level,"
                      "category_id,category_name_ko,"
                      "metric_id,metric_name_ko,default_weight,is_score_metric,"
                      "raw_value,normalized_value,score_100,unit",
            "is_score_metric": "eq.true",
            "order": "region_id.asc,category_id.asc",
        },
    )
    return {"count": len(data), "scores": data}


# ──────────────────────────────────────────────
# 3. 지역 상세 보기 (region_id 필터)
# ──────────────────────────────────────────────
@app.get(
    "/scores/{region_id}",
    summary="지역 상세 점수 조회",
    description="특정 지역의 전 지표 raw_value + score_100을 반환합니다.",
)
async def get_region_scores(region_id: str):
    data = await supa_get(
        "v_region_metric_scores",
        params={
            "select": "region_id,region_name_ko,region_level,"
                      "category_id,category_name_ko,"
                      "metric_id,metric_name_ko,default_weight,is_score_metric,"
                      "raw_value,normalized_value,score_100,unit",
            "region_id": f"eq.{region_id}",
            "order": "category_id.asc,metric_id.asc",
        },
    )
    if not data:
        raise HTTPException(status_code=404, detail=f"region_id '{region_id}' 없음")

    # 카테고리별 그룹핑 (서버에서 편의 제공, 프론트 선택 사용)
    cats: dict = {}
    for row in data:
        c = row["category_id"]
        cats.setdefault(c, {"category_name_ko": row["category_name_ko"], "metrics": []})
        cats[c]["metrics"].append(row)

    return {
        "region_id": region_id,
        "region_name_ko": data[0]["region_name_ko"],
        "categories": cats,
        "raw": data,
    }


# ──────────────────────────────────────────────
# 4. 프리셋 조회
# ──────────────────────────────────────────────
@app.get(
    "/presets",
    summary="추천 프리셋 조회",
    description="프론트 버튼용 카테고리 가중치 프리셋 목록을 반환합니다.",
)
async def get_presets():
    data = await supa_get(
        "recommendation_presets",
        params={
            "select": "preset_id,preset_name_ko,"
                      "traffic_weight,culture_weight,convenience_weight,"
                      "safety_weight,nature_weight",
            "order": "preset_id.asc",
        },
    )
    return {"count": len(data), "presets": data}


# ──────────────────────────────────────────────
# 5. 헬스 체크
# ──────────────────────────────────────────────
@app.get("/health", include_in_schema=False)
async def health():
    try:
        await supa_get("regions", params={"select": "region_id", "limit": "1"})
        return {"status": "ok", "supabase": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
