from fastapi import APIRouter, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.models.schemas import AiExplainRegionRequest, RecommendationRequest, RecommendationResponse
from app.services.recommender import normalize_dict, rank_regions
from app.services.repository import RegionRepository
from app.services.ai_rag import explain_region


settings = get_settings()
repo = RegionRepository()

app = FastAPI(
    title="MEOMUM API",
    version="1.0.0",
)

# Development CORS policy for React/Vite.
# This allows localhost / 127.0.0.1 / private LAN origins on any port,
# while still supporting explicit production origins from FRONTEND_ORIGINS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()


@router.get("/")
async def root():
    return {"service": "MEOMUM", "status": "ok"}


@router.get("/health")
async def health():
    return await repo.health()


@router.get("/regions")
async def list_regions(
    region_level: str = Query("sigungu", pattern="^(sido|sigungu)$"),
):
    return await repo.list_regions(region_level)


@router.get("/scores")
async def list_scores(
    region_level: str = Query("sigungu", pattern="^(sido|sigungu)$"),
):
    regions = await repo.list_regions(region_level)
    return [
        {
            "region_id": r.region_id,
            "region_name_ko": r.region_name_ko,
            "region_name_en": r.region_name_en,
            "categoryScores": r.categoryScores,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "mapX": r.map_x,
            "mapY": r.map_y,
        }
        for r in regions
    ]


@router.get("/scores/{region_id}")
async def get_score_detail(region_id: str):
    region = await repo.get_region(region_id)
    if not region:
        raise HTTPException(status_code=404, detail="지역을 찾을 수 없습니다.")
    return region


@router.get("/regions/{region_id}/details")
async def get_region_detail(region_id: str):
    return await get_score_detail(region_id)


@router.get("/presets")
async def list_presets():
    return await repo.list_presets()


@router.get("/metrics")
async def list_metrics():
    return await repo.list_metrics()


@router.get("/data-versions/latest")
async def latest_data_version():
    version = await repo.data_version()
    return {
        "version": version,
        "updatedAt": f"{version}T09:00:00+09:00",
        "description": f"{version} 기준 최신 지표 데이터입니다.",
    }


@router.post("/recommendations", response_model=RecommendationResponse)
async def recommend(payload: RecommendationRequest):
    preset_id = payload.preset_id or "default"

    if payload.weights:
        try:
            weights = payload.weights.normalized().model_dump()
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
    else:
        preset = await repo.get_preset(preset_id)
        if not preset:
            raise HTTPException(status_code=404, detail="프리셋을 찾을 수 없습니다.")
        weights = normalize_dict(preset.weights)

    regions = await repo.list_regions(payload.region_level)
    recommendations = rank_regions(
        regions=regions,
        weights=weights,
        limit=payload.limit,
        language=payload.language,
    )

    return RecommendationResponse(
        recommendations=recommendations,
        weights=weights,
        preset_id=preset_id,
        region_level=payload.region_level,
        dataVersion=await repo.data_version(),
    )


@router.post("/ai/explain-region")
async def ai_explain_region(payload: AiExplainRegionRequest):
    try:
        result = await explain_region(
            repo=repo,
            region_id=payload.region_id,
            weights=payload.weights.model_dump(),
            language=payload.language,
            preset_id=payload.preset_id,
        )
        return {"success": True, "data": result}
    except ValueError as exc:
        if str(exc) == "REGION_NOT_FOUND":
            raise HTTPException(status_code=404, detail="지역을 찾을 수 없습니다.")
        raise HTTPException(status_code=400, detail=str(exc))


for prefix in ("", "/api", "/api/v1"):
    app.include_router(router, prefix=prefix)
