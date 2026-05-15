"""
공통 Pytest 픽스처 및 설정.

TestClient는 FastAPI ASGI 앱을 실제 HTTP 서버 없이 직접 호출하므로
포트 충돌 없이 병렬 실행이 가능합니다.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    """세션 전체에서 재사용하는 동기 TestClient."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture(scope="session")
def default_payload() -> dict:
    return {
        "preset_id": "default",
        "limit": 5,
        "region_level": "sigungu",
        "language": "ko",
    }


@pytest.fixture(scope="session")
def all_preset_ids() -> list[str]:
    return [
        "default",
        "foreign_tourist",
        "remote_worker",
        "active_senior",
        "culture_single_couple",
    ]
