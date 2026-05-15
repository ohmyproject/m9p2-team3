from typing import Dict, List
from app.models.schemas import Region, RecommendationItem, Weights

CATEGORY_NAMES = {
    "traffic": "교통",
    "culture": "문화·여가·디지털",
    "convenience": "생활편의",
    "safety": "안전",
    "nature": "자연",
}


def normalize_dict(weights: Dict[str, float]) -> Dict[str, float]:
    model = Weights(**weights).normalized()
    return model.model_dump()


def calculate_final_score(region: Region, weights: Dict[str, float]) -> float:
    score = 0.0
    for key, weight in weights.items():
        score += region.categoryScores.get(key, 0) * weight
    return round(score, 1)


def build_reasons(region: Region, weights: Dict[str, float], language: str = "ko") -> List[str]:
    contributions = []
    for key, score in region.categoryScores.items():
        contributions.append((key, score * weights.get(key, 0), score))
    top = sorted(contributions, key=lambda x: x[1], reverse=True)[:2]
    if language == "en":
        names = {
            "traffic": "traffic",
            "culture": "culture/leisure/digital",
            "convenience": "daily convenience",
            "safety": "safety",
            "nature": "nature",
        }
        return [
            f"Strong {names[top[0][0]]} and {names[top[1][0]]} indicators make this area suitable for a long stay.",
            f"Recommended spots include {', '.join([s.name for s in region.tourist_spots[:2]])}.",
        ]
    return [
        f"{CATEGORY_NAMES[top[0][0]]}와 {CATEGORY_NAMES[top[1][0]]} 지표 기여도가 높아 장기체류 관광에 적합합니다.",
        f"대표 관광지로 {', '.join([s.name for s in region.tourist_spots[:2]])} 등을 추천합니다.",
    ]


def rank_regions(regions: List[Region], weights: Dict[str, float], limit: int, language: str = "ko") -> List[RecommendationItem]:
    scored = [(calculate_final_score(r, weights), r) for r in regions]
    ranked = sorted(scored, key=lambda x: x[0], reverse=True)[:limit]
    items = []
    for idx, (final_score, region) in enumerate(ranked, start=1):
        items.append(
            RecommendationItem(
                rank=idx,
                region_id=region.region_id,
                region_level=region.region_level,
                regionNameKo=region.region_name_ko,
                regionNameEn=region.region_name_en,
                parentRegionNameKo=region.parent_region_name_ko,
                parentLogoKey=region.parent_logo_key,
                finalScore=final_score,
                categoryScores=region.categoryScores,
                reasons=build_reasons(region, weights, language),
                touristSpots=region.tourist_spots,
                latitude=region.latitude,
                longitude=region.longitude,
                mapX=region.map_x,
                mapY=region.map_y,
                naverMap=region.naverMap,
            )
        )
    return items
