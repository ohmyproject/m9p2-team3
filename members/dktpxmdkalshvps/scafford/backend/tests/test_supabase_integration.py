"""
TC-SB01 ~ TC-SB12: Supabase 실제 연결 통합 테스트

실행 조건:
  SUPABASE_URL + SUPABASE_ANON_KEY 가 설정된 경우에만 실행됩니다.
  (.env 파일 또는 환경 변수)

실행 방법:
  cd backend
  pytest tests/test_supabase_integration.py -v

  특정 클래스만 실행:
  pytest tests/test_supabase_integration.py::TestSupabaseRegions -v
"""

import pytest

from app.core.config import get_settings
from app.services.repository import RegionRepository

_CATEGORY_KEYS = {"traffic", "culture", "convenience", "safety", "nature"}

pytestmark = pytest.mark.skipif(
    not get_settings().supabase_enabled,
    reason="SUPABASE_URL / SUPABASE_ANON_KEY 미설정 — Supabase 통합 테스트 건너뜀",
)


@pytest.fixture(autouse=True)
def force_supabase(monkeypatch):
    """_running_under_pytest() 가드를 우회해 Supabase 경로를 강제합니다."""
    monkeypatch.setenv("MEOMUM_DATA_SOURCE", "supabase")


@pytest.fixture
def repo() -> RegionRepository:
    return RegionRepository()


# ── Health ──────────────────────────────────────────────────────────────────


class TestSupabaseHealth:
    async def test_database_is_supabase(self, repo):
        """TC-SB01: health()가 database='supabase'를 반환한다."""
        result = await repo.health()
        assert result["database"] == "supabase", f"실제 응답: {result}"

    async def test_status_is_ok(self, repo):
        """TC-SB02: health()의 status가 'ok'이다."""
        result = await repo.health()
        assert result["status"] == "ok", f"실제 응답: {result}"


# ── Regions ──────────────────────────────────────────────────────────────────


class TestSupabaseRegions:
    @pytest.fixture(scope="class")
    async def regions(self, repo):
        return await repo.list_regions("sigungu")

    async def test_list_returns_nonempty(self, regions):
        """TC-SB03: list_regions('sigungu')가 비어있지 않은 리스트를 반환한다."""
        assert isinstance(regions, list)
        assert len(regions) > 0

    async def test_all_region_level_sigungu(self, regions):
        """TC-SB04: 반환된 모든 지역의 region_level이 'sigungu'이다."""
        for r in regions:
            assert r.region_level == "sigungu", r.region_id

    async def test_required_fields_present(self, regions):
        """TC-SB05: 각 Region에 region_id, region_name_ko, latitude, longitude가 있다."""
        for r in regions:
            assert r.region_id, "region_id 없음"
            assert r.region_name_ko, f"{r.region_id}: region_name_ko 없음"
            assert r.latitude != 0 or r.longitude != 0, f"{r.region_id}: 위경도 모두 0"

    async def test_category_scores_five_keys(self, regions):
        """TC-SB06: 각 Region의 categoryScores에 5개 카테고리가 모두 있다."""
        for r in regions:
            assert set(r.categoryScores.keys()) == _CATEGORY_KEYS, (
                f"{r.region_id}: {set(r.categoryScores.keys())}"
            )

    async def test_category_scores_in_range(self, regions):
        """TC-SB07: 모든 categoryScores 값이 0 이상 100 이하이다."""
        for r in regions:
            for key, val in r.categoryScores.items():
                assert 0 <= val <= 100, f"{r.region_id}.{key}={val}"

    async def test_get_region_matches_list(self, repo, regions):
        """TC-SB08: get_region(id)가 list_regions()의 첫 번째 항목과 일치한다."""
        first = regions[0]
        fetched = await repo.get_region(first.region_id)
        assert fetched is not None
        assert fetched.region_id == first.region_id
        assert fetched.region_name_ko == first.region_name_ko

    async def test_get_region_unknown_returns_none(self, repo):
        """TC-SB09: 존재하지 않는 region_id 조회 시 None을 반환한다."""
        result = await repo.get_region("nonexistent-region-xyz-000")
        assert result is None


# ── Presets ──────────────────────────────────────────────────────────────────


class TestSupabasePresets:
    @pytest.fixture(scope="class")
    async def presets(self, repo):
        return await repo.list_presets()

    async def test_list_returns_nonempty(self, presets):
        """TC-SB10: list_presets()가 비어있지 않은 리스트를 반환한다."""
        assert isinstance(presets, list)
        assert len(presets) > 0

    async def test_weights_sum_positive(self, presets):
        """TC-SB11: 각 Preset의 weights 합계가 0 초과이다."""
        for p in presets:
            total = sum(p.weights.values())
            assert total > 0, f"preset={p.preset_id} weights_sum={total}"

    async def test_weights_have_five_keys(self, presets):
        """TC-SB12: 각 Preset의 weights에 5개 카테고리가 모두 있다."""
        for p in presets:
            assert set(p.weights.keys()) == _CATEGORY_KEYS, (
                f"preset={p.preset_id}: {set(p.weights.keys())}"
            )
