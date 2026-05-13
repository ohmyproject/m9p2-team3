from typing import List, Optional
import httpx
from app.core.config import get_settings
from app.models.schemas import Region, Preset, MetricMetadata
from app.data.mock_data import REGIONS, PRESETS, METRIC_METADATA, DATA_VERSION


class RegionRepository:
    """Supabase REST를 우선 사용하고, 설정이 없거나 실패하면 mock 데이터를 사용합니다."""

    def __init__(self):
        self.settings = get_settings()

    async def health(self) -> dict:
        if not self.settings.supabase_enabled:
            return {"status": "ok", "database": "mock", "message": "Supabase env가 없어 mock 데이터로 실행 중입니다."}
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                res = await client.get(
                    f"{self.settings.supabase_url}/rest/v1/regions?select=region_id&limit=1",
                    headers={"apikey": self.settings.supabase_anon_key, "Authorization": f"Bearer {self.settings.supabase_anon_key}"},
                )
                res.raise_for_status()
            return {"status": "ok", "database": "supabase"}
        except Exception as exc:
            return {"status": "degraded", "database": "mock", "message": str(exc)}

    async def list_regions(self, region_level: str = "sigungu") -> List[Region]:
        return [r for r in REGIONS if r.region_level == region_level]

    async def get_region(self, region_id: str) -> Optional[Region]:
        return next((r for r in REGIONS if r.region_id == region_id), None)

    async def list_presets(self) -> List[Preset]:
        return PRESETS

    async def get_preset(self, preset_id: str) -> Optional[Preset]:
        return next((p for p in PRESETS if p.preset_id == preset_id), None)

    async def list_metrics(self) -> List[MetricMetadata]:
        return METRIC_METADATA

    async def data_version(self) -> str:
        return DATA_VERSION
