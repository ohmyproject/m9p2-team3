from typing import Dict, List, Optional, Literal, Any
from pydantic import BaseModel, Field, field_validator

CategoryKey = Literal["traffic", "culture", "convenience", "safety", "nature"]
RegionLevel = Literal["sido", "sigungu"]


class Weights(BaseModel):
    traffic: float = Field(ge=0)
    culture: float = Field(ge=0)
    convenience: float = Field(ge=0)
    safety: float = Field(ge=0)
    nature: float = Field(ge=0)

    def normalized(self) -> "Weights":
        total = self.traffic + self.culture + self.convenience + self.safety + self.nature
        if total <= 0:
            raise ValueError("모든 가중치가 0일 수 없습니다.")
        return Weights(
            traffic=round(self.traffic / total, 6),
            culture=round(self.culture / total, 6),
            convenience=round(self.convenience / total, 6),
            safety=round(self.safety / total, 6),
            nature=round(self.nature / total, 6),
        )


class RecommendationRequest(BaseModel):
    preset_id: Optional[str] = "default"
    weights: Optional[Weights] = None
    limit: int = Field(default=5, ge=1, le=50)
    region_level: RegionLevel = "sigungu"
    language: Literal["ko", "en"] = "ko"


class TouristSpot(BaseModel):
    name: str
    type: str
    description: str
    address: Optional[str] = None


class MetricValue(BaseModel):
    metric_id: str
    metric_name_ko: str
    metric_name_en: str
    category: CategoryKey
    score_100: float
    raw_value: float
    unit: str
    source: str
    year: str


class NaverMap(BaseModel):
    query: str
    webUrl: str
    appUrl: str


class Region(BaseModel):
    region_id: str
    region_level: RegionLevel
    region_name_ko: str
    region_name_en: str
    parent_region_id: str
    parent_region_name_ko: str
    parent_logo_key: str
    latitude: float
    longitude: float
    map_x: float = Field(description="korea-map.png 기준 X 위치 퍼센트")
    map_y: float = Field(description="korea-map.png 기준 Y 위치 퍼센트")
    categoryScores: Dict[str, float]
    metrics: List[MetricValue]
    tourist_spots: List[TouristSpot]
    naverMap: NaverMap


class RecommendationItem(BaseModel):
    rank: int
    region_id: str
    region_level: RegionLevel
    regionNameKo: str
    regionNameEn: str
    parentRegionNameKo: str
    parentLogoKey: str
    finalScore: float
    categoryScores: Dict[str, float]
    reasons: List[str]
    touristSpots: List[TouristSpot]
    latitude: float
    longitude: float
    mapX: float
    mapY: float
    naverMap: NaverMap


class RecommendationResponse(BaseModel):
    recommendations: List[RecommendationItem]
    weights: Dict[str, float]
    preset_id: str
    region_level: RegionLevel
    dataVersion: str


class Preset(BaseModel):
    preset_id: str
    name_ko: str
    name_en: str
    description_ko: str
    description_en: str
    weights: Dict[str, float]


class MetricMetadata(BaseModel):
    metric_id: str
    category: CategoryKey
    name_ko: str
    name_en: str
    unit: str
    source: str
    data_level: str
    description: str
    year: str

class AiExplainRegionRequest(BaseModel):
    region_id: str
    weights: Weights
    language: Literal["ko", "en"] = "ko"


class AiCompareRegionsRequest(BaseModel):
    region_ids: List[str] = Field(min_length=2, max_length=3)
    weights: Weights
    language: Literal["ko", "en"] = "ko"

    @field_validator("region_ids")
    @classmethod
    def validate_region_ids(cls, value: List[str]) -> List[str]:
        unique_ids = list(dict.fromkeys(value))

        if len(unique_ids) < 2:
            raise ValueError("비교할 지역은 최소 2개 이상이어야 합니다.")

        if len(unique_ids) > 3:
            raise ValueError("비교할 지역은 최대 3개까지 가능합니다.")

        return unique_ids
