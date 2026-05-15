"""
TC-B01 ~ TC-B06 : 프리셋 엔드포인트 테스트
"""
import pytest


EXPECTED_PRESET_IDS = {
    "default",
    "foreign_tourist",
    "remote_worker",
    "active_senior",
    "culture_single_couple",
}

WEIGHT_KEYS = {"traffic", "culture", "convenience", "safety", "nature"}


class TestPresets:
    """GET /presets — 프리셋 목록"""

    @pytest.fixture(scope="class")
    def presets(self, client):
        return client.get("/presets").json()

    def test_status_200(self, client):
        """TC-B01: GET /presets가 HTTP 200을 반환한다."""
        assert client.get("/presets").status_code == 200

    def test_count_five(self, presets):
        """TC-B02: 프리셋이 정확히 5개 반환된다."""
        assert len(presets) == 5

    def test_preset_ids_complete(self, presets):
        """TC-B03: 기대하는 5개 preset_id가 모두 포함된다."""
        returned = {p["preset_id"] for p in presets}
        assert returned == EXPECTED_PRESET_IDS

    def test_each_preset_has_required_fields(self, presets):
        """TC-B04: 각 프리셋에 필수 필드(preset_id, name_ko, name_en, weights)가 있다."""
        required = {"preset_id", "name_ko", "name_en", "description_ko", "description_en", "weights"}
        for preset in presets:
            missing = required - set(preset.keys())
            assert not missing, f"preset={preset['preset_id']} missing={missing}"

    def test_each_preset_weights_have_five_keys(self, presets):
        """TC-B05: 각 프리셋의 weights에 5개 카테고리 키가 모두 있다."""
        for preset in presets:
            assert set(preset["weights"].keys()) == WEIGHT_KEYS, preset["preset_id"]

    def test_each_preset_weights_sum_to_one(self, presets):
        """TC-B06: 각 프리셋의 가중치 합이 1.0이다 (±0.01 허용)."""
        for preset in presets:
            total = sum(preset["weights"].values())
            assert abs(total - 1.0) < 0.01, f"preset={preset['preset_id']} sum={total}"

    def test_api_prefix_v1_same_result(self, client, presets):
        """TC-B07: /api/v1/presets가 /presets와 동일한 결과를 반환한다."""
        v1 = client.get("/api/v1/presets").json()
        assert len(v1) == len(presets)
        ids_base = {p["preset_id"] for p in presets}
        ids_v1 = {p["preset_id"] for p in v1}
        assert ids_base == ids_v1
