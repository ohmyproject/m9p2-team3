"""
TC-D01 ~ TC-D06 : 메트릭 및 데이터 버전 엔드포인트 테스트
"""
import re
import pytest

EXPECTED_METRIC_IDS = {
    "bus_accessibility",
    "rail_accessibility",
    "tourism_lodging",
    "public_wifi",
    "clinics",
    "pharmacies",
    "safety_index",
    "parks",
    "pm10",
}
VALID_CATEGORIES = {"traffic", "culture", "convenience", "safety", "nature"}


class TestMetrics:
    """GET /metrics — 지표 메타데이터"""

    @pytest.fixture(scope="class")
    def metrics(self, client):
        return client.get("/metrics").json()

    def test_status_200(self, client):
        """TC-D01: GET /metrics가 HTTP 200을 반환한다."""
        assert client.get("/metrics").status_code == 200

    def test_count_nine(self, metrics):
        """TC-D02: 지표가 정확히 9개 반환된다."""
        assert len(metrics) == 9

    def test_metric_ids_complete(self, metrics):
        """TC-D03: 기대하는 9개 metric_id가 모두 포함된다."""
        returned = {m["metric_id"] for m in metrics}
        assert returned == EXPECTED_METRIC_IDS

    def test_all_categories_covered(self, metrics):
        """TC-D04: 반환된 지표들이 5개 카테고리를 모두 커버한다."""
        covered = {m["category"] for m in metrics}
        assert covered == VALID_CATEGORIES

    def test_each_metric_has_required_fields(self, metrics):
        """TC-D05: 각 지표에 필수 필드(metric_id, category, name_ko, unit, source, year)가 있다."""
        required = {"metric_id", "category", "name_ko", "unit", "source", "year"}
        for m in metrics:
            missing = required - set(m.keys())
            assert not missing, f"metric_id={m['metric_id']} missing={missing}"

    def test_metric_categories_valid(self, metrics):
        """TC-D06: 각 지표의 category 값이 허용된 5개 중 하나이다."""
        for m in metrics:
            assert m["category"] in VALID_CATEGORIES, f"{m['metric_id']}.category={m['category']}"


class TestDataVersion:
    """GET /data-versions/latest — 데이터 버전"""

    @pytest.fixture(scope="class")
    def version_data(self, client):
        return client.get("/data-versions/latest").json()

    def test_status_200(self, client):
        """TC-D07: GET /data-versions/latest가 HTTP 200을 반환한다."""
        assert client.get("/data-versions/latest").status_code == 200

    def test_version_field_exists(self, version_data):
        """TC-D08: 응답에 version 필드가 있다."""
        assert "version" in version_data

    def test_version_format_yyyy_mm_dd(self, version_data):
        """TC-D09: version 값이 YYYY-MM-DD 형식이다."""
        pattern = r"^\d{4}-\d{2}-\d{2}$"
        assert re.match(pattern, version_data["version"]), f"version={version_data['version']}"

    def test_updated_at_field_exists(self, version_data):
        """TC-D10: 응답에 updatedAt 필드가 있다."""
        assert "updatedAt" in version_data
