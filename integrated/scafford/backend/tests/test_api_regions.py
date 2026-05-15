"""
TC-C01 ~ TC-C18 : 지역(regions) 및 점수(scores) 엔드포인트 테스트
"""
import pytest

REQUIRED_SCORE_FIELDS = {
    "region_id", "region_name_ko", "region_name_en",
    "categoryScores", "latitude", "longitude", "mapX", "mapY",
}
CATEGORY_KEYS = {"traffic", "culture", "convenience", "safety", "nature"}


class TestRegions:
    """GET /regions — 지역 목록"""

    def test_sigungu_status_200(self, client):
        """TC-C01: region_level=sigungu 요청이 HTTP 200을 반환한다."""
        assert client.get("/regions?region_level=sigungu").status_code == 200

    def test_sigungu_count_ten(self, client):
        """TC-C02: sigungu 지역 목록이 정확히 10개 반환된다."""
        data = client.get("/regions?region_level=sigungu").json()
        assert len(data) == 10

    def test_sido_returns_empty(self, client):
        """TC-C03: region_level=sido 요청 시 빈 배열을 반환한다 (mock 데이터에 sido 미포함)."""
        data = client.get("/regions?region_level=sido").json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_invalid_level_returns_422(self, client):
        """TC-C04: 잘못된 region_level 값에 HTTP 422를 반환한다."""
        assert client.get("/regions?region_level=invalid").status_code == 422

    def test_each_region_has_region_level_sigungu(self, client):
        """TC-C05: 반환된 모든 지역의 region_level이 'sigungu'이다."""
        data = client.get("/regions?region_level=sigungu").json()
        for region in data:
            assert region["region_level"] == "sigungu", region["region_id"]

    def test_each_region_has_coordinates(self, client):
        """TC-C06: 모든 지역에 위경도(latitude, longitude)가 있다."""
        data = client.get("/regions?region_level=sigungu").json()
        for region in data:
            assert region.get("latitude") is not None, region["region_id"]
            assert region.get("longitude") is not None, region["region_id"]

    def test_each_region_has_tourist_spots(self, client):
        """TC-C07: 모든 지역에 tourist_spots 리스트가 있다."""
        data = client.get("/regions?region_level=sigungu").json()
        for region in data:
            assert isinstance(region.get("tourist_spots"), list), region["region_id"]
            assert len(region["tourist_spots"]) > 0, f"{region['region_id']} has no spots"


class TestScores:
    """GET /scores — 점수 목록"""

    @pytest.fixture(scope="class")
    def scores(self, client):
        return client.get("/scores").json()

    def test_status_200(self, client):
        """TC-C08: GET /scores가 HTTP 200을 반환한다."""
        assert client.get("/scores").status_code == 200

    def test_count_ten(self, scores):
        """TC-C09: 점수 목록이 정확히 10개 반환된다."""
        assert len(scores) == 10

    def test_required_fields_present(self, scores):
        """TC-C10: 각 점수 항목에 필수 8개 필드가 모두 있다."""
        for item in scores:
            missing = REQUIRED_SCORE_FIELDS - set(item.keys())
            assert not missing, f"region_id={item.get('region_id')} missing={missing}"

    def test_category_scores_have_five_keys(self, scores):
        """TC-C11: 각 항목의 categoryScores에 5개 카테고리가 모두 있다."""
        for item in scores:
            assert set(item["categoryScores"].keys()) == CATEGORY_KEYS, item["region_id"]

    def test_scores_in_range_0_to_100(self, scores):
        """TC-C12: 모든 카테고리 점수가 0 이상 100 이하이다."""
        for item in scores:
            for key, val in item["categoryScores"].items():
                assert 0 <= val <= 100, f"{item['region_id']}.{key}={val}"


class TestScoreDetail:
    """GET /scores/{region_id} — 지역 상세 점수"""

    @pytest.fixture(scope="class")
    def jongno(self, client):
        return client.get("/scores/seoul-jongno").json()

    def test_known_region_status_200(self, client):
        """TC-C13: 존재하는 region_id 요청이 HTTP 200을 반환한다."""
        assert client.get("/scores/seoul-jongno").status_code == 200

    def test_unknown_region_status_404(self, client):
        """TC-C14: 존재하지 않는 region_id 요청이 HTTP 404를 반환한다."""
        assert client.get("/scores/nonexistent-region").status_code == 404

    def test_detail_has_metrics(self, jongno):
        """TC-C15: 상세 응답에 metrics 배열이 있다."""
        assert isinstance(jongno.get("metrics"), list)
        assert len(jongno["metrics"]) > 0

    def test_detail_has_nine_metrics(self, jongno):
        """TC-C16: 상세 응답의 metrics가 9개이다."""
        assert len(jongno["metrics"]) == 9

    def test_detail_has_tourist_spots(self, jongno):
        """TC-C17: 상세 응답에 tourist_spots가 있다."""
        assert isinstance(jongno.get("tourist_spots"), list)
        assert len(jongno["tourist_spots"]) > 0

    def test_region_detail_alias(self, client):
        """TC-C18: /regions/{id}/details가 /scores/{id}와 동일한 결과를 반환한다."""
        via_scores = client.get("/scores/jeju-jeju").json()
        via_details = client.get("/regions/jeju-jeju/details").json()
        assert via_scores["region_id"] == via_details["region_id"]
        assert via_scores["region_name_ko"] == via_details["region_name_ko"]
