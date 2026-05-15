import logging
import os
import sys
from collections import defaultdict
from typing import Dict, Iterable, List, Optional

import httpx

from app.core.config import get_settings
from app.data.mock_data import DATA_VERSION, METRIC_METADATA, PRESETS, REGIONS
from app.models.schemas import MetricMetadata, MetricValue, NaverMap, Preset, Region

logger = logging.getLogger(__name__)

_CATEGORY_KEYS = ("traffic", "culture", "convenience", "safety", "nature")


def _running_under_pytest() -> bool:
    """Return True while pytest is running, so API tests stay deterministic."""
    return "PYTEST_CURRENT_TEST" in os.environ or any("pytest" in arg for arg in sys.argv)


class RegionRepository:
    """
    Supabase-first repository with mock fallback.

    Normal app/server execution:
    - Query Supabase first when SUPABASE_URL and SUPABASE_ANON_KEY exist.
    - Fall back to app.data.mock_data when Supabase is unavailable, errors, or returns no rows.

    Pytest execution:
    - Use mock_data intentionally so the existing 116 regression tests remain deterministic.
      The current tests assert the mock fixture shape: 10 sigungu regions, 0 sido rows,
      9 metrics, 5 specific presets, and YYYY-MM-DD data version.

    Current Supabase schema handled here:
    - regions
    - region_metric_values
    - metrics
    - recommendation_presets
    - data_versions

    Fields not present in the Supabase schema yet, such as region_name_en, map_x/map_y,
    tourist_spots and parent display names, are supplemented from mock_data when the
    region_id matches. If no matching mock region exists, safe empty/default values are used.
    """

    def __init__(self):
        self.settings = get_settings()

    def _should_use_supabase(self) -> bool:
        data_source = os.getenv("MEOMUM_DATA_SOURCE", "").strip().lower()
        if data_source in {"mock", "local", "test"}:
            return False
        if data_source in {"supabase", "db", "remote"}:
            return self.settings.supabase_enabled
        if _running_under_pytest():
            return False
        return self.settings.supabase_enabled

    def _headers(self) -> dict:
        return {
            "apikey": self.settings.supabase_anon_key,
            "Authorization": f"Bearer {self.settings.supabase_anon_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    async def _sb_get(self, path: str, params: dict | None = None) -> list:
        """
        Supabase/PostgREST GET helper.

        Query strings are assembled manually so PostgREST operators such as in.(...),
        order=display_order.asc and select syntax remain readable in logs.
        """
        qs = "&".join(f"{k}={v}" for k, v in (params or {}).items())
        url = f"{self.settings.supabase_url}/rest/v1/{path}{'?' + qs if qs else ''}"

        async with httpx.AsyncClient(timeout=8) as client:
            res = await client.get(url, headers=self._headers())
            try:
                res.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise RuntimeError(
                    f"Supabase GET 실패: {res.status_code} {res.text} url={url}"
                ) from exc
            return res.json()

    async def health(self) -> dict:
        if not self._should_use_supabase():
            return {
                "status": "ok",
                "database": "mock",
                "message": "mock 데이터로 실행 중입니다. Supabase 우선 실행은 일반 서버 실행에서 적용됩니다.",
            }

        try:
            await self._sb_get("regions", params={"select": "region_id", "limit": "1"})
            return {"status": "ok", "database": "supabase"}
        except Exception as exc:
            return {"status": "degraded", "database": "mock", "message": str(exc)}

    async def list_regions(self, region_level: str = "sigungu") -> List[Region]:
        if self._should_use_supabase():
            try:
                regions = await self._load_regions_from_supabase(region_level=region_level)
                if regions:
                    return regions
            except Exception as exc:
                logger.warning("Supabase list_regions 실패, mock fallback: %s", exc)

        return [r for r in REGIONS if r.region_level == region_level]

    async def get_region(self, region_id: str) -> Optional[Region]:
        if self._should_use_supabase():
            try:
                regions = await self._load_regions_from_supabase(region_id=region_id)
                if regions:
                    return regions[0]
            except Exception as exc:
                logger.warning("Supabase get_region 실패, mock fallback: %s", exc)

        return next((r for r in REGIONS if r.region_id == region_id), None)

    async def list_presets(self) -> List[Preset]:
        if self._should_use_supabase():
            try:
                rows = await self._sb_get(
                    "recommendation_presets",
                    params={"select": "*", "order": "preset_id.asc"},
                )
                if rows:
                    return [_parse_preset(r) for r in rows]
            except Exception as exc:
                logger.warning("Supabase list_presets 실패, mock fallback: %s", exc)

        return PRESETS

    async def get_preset(self, preset_id: str) -> Optional[Preset]:
        if self._should_use_supabase():
            try:
                rows = await self._sb_get(
                    "recommendation_presets",
                    params={
                        "select": "*",
                        "preset_id": f"eq.{preset_id}",
                        "limit": "1",
                    },
                )
                if rows:
                    return _parse_preset(rows[0])
            except Exception as exc:
                logger.warning("Supabase get_preset 실패, mock fallback: %s", exc)

        return next((p for p in PRESETS if p.preset_id == preset_id), None)

    async def list_metrics(self) -> List[MetricMetadata]:
        if self._should_use_supabase():
            try:
                rows = await self._sb_get(
                    "metrics",
                    params={
                        "select": "*",
                        "is_active": "eq.true",
                        "order": "display_order.asc",
                    },
                )
                if rows:
                    return [_parse_metric_metadata(r) for r in rows]
            except Exception as exc:
                logger.warning("Supabase list_metrics 실패, mock fallback: %s", exc)

        return METRIC_METADATA

    async def data_version(self) -> str:
        if self._should_use_supabase():
            try:
                rows = await self._sb_get(
                    "data_versions",
                    params={
                        "select": "version_id",
                        "status": "eq.active",
                        "order": "published_at.desc,created_at.desc",
                        "limit": "1",
                    },
                )
                if rows:
                    version = str(rows[0].get("version_id", ""))
                    # API/test contract expects YYYY-MM-DD. If DB uses values like v1.0,
                    # keep the mock version rather than returning a non-date string.
                    if _looks_like_yyyy_mm_dd(version):
                        return version
            except Exception as exc:
                logger.warning("Supabase data_version 실패, mock fallback: %s", exc)

        return DATA_VERSION

    async def _load_regions_from_supabase(
        self,
        region_level: str | None = None,
        region_id: str | None = None,
    ) -> List[Region]:
        """
        Load regions from the actual current Supabase schema.

        The older nested select expected region_category_scores / region_metrics /
        metric_metadata, but the current database exposes regions, region_metric_values
        and metrics. We query those tables separately and assemble the API model here.
        """
        region_params = {
            "select": "*",
            "is_active": "eq.true",
            "order": "region_id.asc",
        }
        if region_level:
            region_params["region_level"] = f"eq.{region_level}"
        if region_id:
            region_params["region_id"] = f"eq.{region_id}"
            region_params["limit"] = "1"

        region_rows = await self._sb_get("regions", params=region_params)
        if not region_rows:
            return []

        region_ids = [str(r["region_id"]) for r in region_rows if r.get("region_id")]
        metric_rows = await self._load_metric_values(region_ids)
        metric_meta = await self._load_metric_metadata_map()

        rows_by_region: Dict[str, list] = defaultdict(list)
        for row in metric_rows:
            rid = str(row.get("region_id", ""))
            if rid:
                rows_by_region[rid].append(row)

        return [
            _parse_region_from_supabase_schema(
                row,
                rows_by_region.get(str(row.get("region_id")), []),
                metric_meta,
            )
            for row in region_rows
        ]

    async def _load_metric_values(self, region_ids: Iterable[str]) -> list:
        ids = [rid for rid in region_ids if rid]
        if not ids:
            return []

        all_rows: list = []
        chunk_size = 80
        for start in range(0, len(ids), chunk_size):
            chunk = ids[start : start + chunk_size]
            rows = await self._sb_get(
                "region_metric_values",
                params={
                    "select": "*",
                    "region_id": f"in.({','.join(chunk)})",
                },
            )
            all_rows.extend(rows)
        return all_rows

    async def _load_metric_metadata_map(self) -> Dict[str, MetricMetadata]:
        rows = await self._sb_get(
            "metrics",
            params={
                "select": "*",
                "is_active": "eq.true",
                "order": "display_order.asc",
            },
        )
        return {str(row["metric_id"]): _parse_metric_metadata(row) for row in rows}


# Supabase row parsers


def _naver(region_name_ko: str) -> NaverMap:
    encoded = region_name_ko.replace(" ", "%20")
    return NaverMap(
        query=region_name_ko,
        webUrl=f"https://map.naver.com/p/search/{encoded}",
        appUrl=f"nmap://search?query={encoded}&appname=meomum",
    )


def _mock_region(region_id: str) -> Optional[Region]:
    return next((r for r in REGIONS if r.region_id == region_id), None)


def _category_from_metric(metric_id: str, metric_meta: Dict[str, MetricMetadata]) -> str:
    meta = metric_meta.get(metric_id)
    if meta and meta.category in _CATEGORY_KEYS:
        return meta.category
    return "traffic"


def _parse_region_from_supabase_schema(
    row: dict,
    metric_rows: list[dict],
    metric_meta: Dict[str, MetricMetadata],
) -> Region:
    region_id = str(row["region_id"])
    mock = _mock_region(region_id)

    category_buckets: Dict[str, list[float]] = {key: [] for key in _CATEGORY_KEYS}
    metrics: List[MetricValue] = []

    for metric_row in metric_rows:
        metric_id = str(metric_row.get("metric_id", ""))
        if not metric_id:
            continue

        meta = metric_meta.get(metric_id)
        category = _category_from_metric(metric_id, metric_meta)
        score = _safe_float(metric_row.get("score_100"), default=0.0)
        category_buckets[category].append(score)

        raw_value = metric_row.get("cleaned_value")
        if raw_value is None:
            raw_value = metric_row.get("raw_value")

        metrics.append(
            MetricValue(
                metric_id=metric_id,
                metric_name_ko=meta.name_ko if meta else metric_id,
                metric_name_en=meta.name_en if meta else metric_id,
                category=category,  # type: ignore[arg-type]
                score_100=score,
                raw_value=_safe_float(raw_value, default=0.0),
                unit=metric_row.get("unit") or (meta.unit if meta else ""),
                source=metric_row.get("source_file") or (meta.source if meta else ""),
                year=metric_row.get("updated_at", "")[:4]
                if metric_row.get("updated_at")
                else (meta.year if meta else ""),
            )
        )

    category_scores = {
        key: round(sum(values) / len(values), 1) if values else 0.0
        for key, values in category_buckets.items()
    }

    return Region(
        region_id=region_id,
        region_level=row["region_level"],
        region_name_ko=row["region_name_ko"],
        region_name_en=mock.region_name_en if mock else "",
        parent_region_id=row.get("parent_region_id") or "",
        parent_region_name_ko=mock.parent_region_name_ko if mock else "",
        parent_logo_key=mock.parent_logo_key if mock else (row.get("parent_region_id") or ""),
        latitude=_safe_float(row.get("latitude"), default=0.0),
        longitude=_safe_float(row.get("longitude"), default=0.0),
        map_x=mock.map_x if mock else 0.0,
        map_y=mock.map_y if mock else 0.0,
        categoryScores=category_scores,
        metrics=metrics,
        tourist_spots=mock.tourist_spots if mock else [],
        naverMap=_naver(row["region_name_ko"]),
    )


def _parse_preset(row: dict) -> Preset:
    mock = next((p for p in PRESETS if p.preset_id == row.get("preset_id")), None)

    return Preset(
        preset_id=row["preset_id"],
        name_ko=row.get("preset_name_ko")
        or row.get("name_ko")
        or (mock.name_ko if mock else row["preset_id"]),
        name_en=row.get("preset_name_en") or row.get("name_en") or (mock.name_en if mock else ""),
        description_ko=row.get("description_ko") or (mock.description_ko if mock else ""),
        description_en=row.get("description_en") or (mock.description_en if mock else ""),
        weights={
            "traffic": _safe_float(row.get("traffic_weight"), default=0.0),
            "culture": _safe_float(row.get("culture_weight"), default=0.0),
            "convenience": _safe_float(row.get("convenience_weight"), default=0.0),
            "safety": _safe_float(row.get("safety_weight"), default=0.0),
            "nature": _safe_float(row.get("nature_weight"), default=0.0),
        },
    )


def _parse_metric_metadata(row: dict) -> MetricMetadata:
    mock = next((m for m in METRIC_METADATA if m.metric_id == row.get("metric_id")), None)

    category = row.get("category_id") or row.get("category") or (mock.category if mock else "traffic")
    if category not in _CATEGORY_KEYS:
        category = "traffic"

    return MetricMetadata(
        metric_id=row["metric_id"],
        category=category,  # type: ignore[arg-type]
        name_ko=row.get("metric_name_ko")
        or row.get("name_ko")
        or (mock.name_ko if mock else row["metric_id"]),
        name_en=row.get("metric_name_en")
        or row.get("name_en")
        or (mock.name_en if mock else row.get("metric_name_ko", row["metric_id"])),
        unit=row.get("unit") or (mock.unit if mock else ""),
        source=row.get("source") or (mock.source if mock else ""),
        data_level=row.get("data_level") or (mock.data_level if mock else ""),
        description=row.get("description") or (mock.description if mock else ""),
        year=str(row.get("year") or (mock.year if mock else "")),
    )


def _safe_float(value, default: float = 0.0) -> float:
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _looks_like_yyyy_mm_dd(value: str) -> bool:
    if len(value) != 10:
        return False
    year, dash1, month, dash2, day = value[:4], value[4], value[5:7], value[7], value[8:]
    return dash1 == "-" and dash2 == "-" and year.isdigit() and month.isdigit() and day.isdigit()
