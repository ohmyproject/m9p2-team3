"""
TC-G01 ~ TC-G14 : schemas.py 단위 테스트

Pydantic 모델의 유효성 검사 및 정규화 메서드를 검증합니다.
"""
import pytest
from pydantic import ValidationError
from app.models.schemas import (
    Weights,
    RecommendationRequest,
    RecommendationResponse,
    RecommendationItem,
    Region,
    Preset,
)


class TestWeights:
    """Weights 모델 유효성 검사"""

    def test_valid_weights_created(self):
        """TC-G01: 유효한 가중치로 Weights 객체가 생성된다."""
        w = Weights(traffic=0.2, culture=0.3, convenience=0.2, safety=0.2, nature=0.1)
        assert w.traffic == 0.2

    def test_negative_weight_raises_validation_error(self):
        """TC-G02: 음수 가중치에 ValidationError가 발생한다."""
        with pytest.raises(ValidationError):
            Weights(traffic=-0.1, culture=0.3, convenience=0.3, safety=0.2, nature=0.2)

    def test_normalized_sum_is_one(self):
        """TC-G03: normalized() 결과의 합이 1.0이다."""
        w = Weights(traffic=1, culture=2, convenience=3, safety=2, nature=2)
        n = w.normalized()
        total = n.traffic + n.culture + n.convenience + n.safety + n.nature
        assert abs(total - 1.0) < 1e-5

    def test_normalized_zero_raises_value_error(self):
        """TC-G04: 모두 0인 가중치에 normalized()가 ValueError를 발생시킨다."""
        w = Weights(traffic=0, culture=0, convenience=0, safety=0, nature=0)
        with pytest.raises(ValueError, match="0"):
            w.normalized()

    def test_normalized_equal_weights(self):
        """TC-G05: 균등 가중치(10, 10, 10, 10, 10)의 정규화 결과는 각 0.2이다."""
        w = Weights(traffic=10, culture=10, convenience=10, safety=10, nature=10)
        n = w.normalized()
        for val in [n.traffic, n.culture, n.convenience, n.safety, n.nature]:
            assert abs(val - 0.2) < 1e-5

    def test_normalized_single_nonzero(self):
        """TC-G06: 하나만 양수인 가중치의 정규화 결과는 해당 항목이 1.0이다."""
        w = Weights(traffic=0, culture=5, convenience=0, safety=0, nature=0)
        n = w.normalized()
        assert abs(n.culture - 1.0) < 1e-5

    def test_normalized_returns_weights_instance(self):
        """TC-G07: normalized()가 Weights 인스턴스를 반환한다."""
        w = Weights(traffic=1, culture=1, convenience=1, safety=1, nature=1)
        assert isinstance(w.normalized(), Weights)


class TestRecommendationRequest:
    """RecommendationRequest 모델 기본값 및 유효성 검사"""

    def test_default_values(self):
        """TC-G08: 기본값이 올바르게 설정된다."""
        req = RecommendationRequest()
        assert req.preset_id == "default"
        assert req.limit == 5
        assert req.region_level == "sigungu"
        assert req.language == "ko"

    def test_limit_minimum_boundary(self):
        """TC-G09: limit=1이 허용된다."""
        req = RecommendationRequest(limit=1)
        assert req.limit == 1

    def test_limit_maximum_boundary(self):
        """TC-G10: limit=50이 허용된다."""
        req = RecommendationRequest(limit=50)
        assert req.limit == 50

    def test_limit_zero_raises(self):
        """TC-G11: limit=0에 ValidationError가 발생한다."""
        with pytest.raises(ValidationError):
            RecommendationRequest(limit=0)

    def test_limit_over_max_raises(self):
        """TC-G12: limit=51에 ValidationError가 발생한다."""
        with pytest.raises(ValidationError):
            RecommendationRequest(limit=51)

    def test_invalid_region_level_raises(self):
        """TC-G13: 잘못된 region_level에 ValidationError가 발생한다."""
        with pytest.raises(ValidationError):
            RecommendationRequest(region_level="county")

    def test_invalid_language_raises(self):
        """TC-G14: 지원하지 않는 language에 ValidationError가 발생한다."""
        with pytest.raises(ValidationError):
            RecommendationRequest(language="ja")
