"""
TC-A01 ~ TC-A04 : 루트 및 헬스 엔드포인트 테스트
"""
import pytest


class TestRoot:
    """GET / — 서비스 기본 응답"""

    def test_status_200(self, client):
        """TC-A01: 루트 요청이 HTTP 200을 반환한다."""
        res = client.get("/")
        assert res.status_code == 200

    def test_service_field(self, client):
        """TC-A02: 응답 body에 service='MEOMUM' 필드가 있다."""
        body = client.get("/").json()
        assert body.get("service") == "MEOMUM"

    def test_status_field_ok(self, client):
        """TC-A03: 응답 body에 status='ok' 필드가 있다."""
        body = client.get("/").json()
        assert body.get("status") == "ok"


class TestHealth:
    """GET /health — 헬스체크"""

    def test_status_200(self, client):
        """TC-A04: 헬스 요청이 HTTP 200을 반환한다."""
        res = client.get("/health")
        assert res.status_code == 200

    def test_has_status_field(self, client):
        """TC-A05: 응답에 status 필드가 존재한다."""
        body = client.get("/health").json()
        assert "status" in body

    def test_has_database_field(self, client):
        """TC-A06: 응답에 database 필드가 존재한다."""
        body = client.get("/health").json()
        assert "database" in body

    def test_status_is_ok_or_degraded(self, client):
        """TC-A07: status 값은 'ok' 또는 'degraded' 중 하나이다."""
        body = client.get("/health").json()
        assert body["status"] in ("ok", "degraded")
