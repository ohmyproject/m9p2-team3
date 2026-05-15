"""
TC-F01 ~ TC-F18 : recommender.py 단위 테스트

서비스 레이어의 점수 계산·정렬·이유 생성 로직을 독립적으로 검증합니다.
"""
import pytest
from app.services.recommender import (
    calculate_final_score,
    build_reasons,
    rank_regions,
    normalize_dict,
)
from app.data.mock_data import REGIONS


def make_weights(traffic=0.2, culture=0.2, convenience=0.2, safety=0.2, nature=0.2):
    return {
        "traffic": traffic,
        "culture": culture,
        "convenience": convenience,
        "safety": safety,
        "nature": nature,
    }


class TestCalculateFinalScore:
    """calculate_final_score 단위 테스트"""

    def test_basic_weighted_sum(self):
        """TC-F01: 단순 가중합이 정확히 계산된다."""
        region = REGIONS[0]  # seoul-jongno: scores={traffic:92, culture:96, ...}
        w = make_weights(traffic=1.0, culture=0.0, convenience=0.0, safety=0.0, nature=0.0)
        score = calculate_final_score(region, w)
        assert score == round(region.categoryScores["traffic"] * 1.0, 1)

    def test_equal_weights_average(self):
        """TC-F02: 균등 가중치(0.2)는 5개 점수의 평균과 같다."""
        region = REGIONS[0]
        w = make_weights()
        score = calculate_final_score(region, w)
        expected = round(sum(region.categoryScores.values()) / 5, 1)
        assert abs(score - expected) < 0.1

    def test_zero_scores_returns_zero(self):
        """TC-F03: 모든 가중치가 0이면 결과가 0이다."""
        region = REGIONS[0]
        w = make_weights(0, 0, 0, 0, 0)
        assert calculate_final_score(region, w) == 0.0

    def test_score_rounded_to_one_decimal(self):
        """TC-F04: 결과가 소수점 1자리로 반올림된다."""
        region = REGIONS[0]
        w = make_weights(0.33, 0.33, 0.34, 0, 0)
        score = calculate_final_score(region, w)
        assert score == round(score, 1)

    def test_single_category_full_weight(self):
        """TC-F05: 단일 카테고리에 가중치 1을 주면 해당 점수만 반환된다."""
        for region in REGIONS[:3]:
            for key in ["traffic", "culture", "convenience", "safety", "nature"]:
                w = {k: (1.0 if k == key else 0.0) for k in make_weights()}
                score = calculate_final_score(region, w)
                assert abs(score - round(region.categoryScores[key], 1)) <= 0.1, (
                    f"{region.region_id}.{key}"
                )


class TestNormalizeDict:
    """normalize_dict 단위 테스트"""

    def test_normalized_sum_is_one(self):
        """TC-F06: 정규화 후 합이 1.0이다."""
        w = normalize_dict({"traffic": 10, "culture": 20, "convenience": 30,
                            "safety": 15, "nature": 25})
        assert abs(sum(w.values()) - 1.0) < 1e-6

    def test_relative_proportions_preserved(self):
        """TC-F07: 정규화 후 상대적 비율이 유지된다."""
        w = normalize_dict({"traffic": 10, "culture": 10, "convenience": 10,
                            "safety": 10, "nature": 10})
        for v in w.values():
            assert abs(v - 0.2) < 1e-6

    def test_zero_weights_raises_value_error(self):
        """TC-F08: 모든 가중치가 0이면 ValueError가 발생한다."""
        with pytest.raises(ValueError, match="0"):
            normalize_dict({"traffic": 0, "culture": 0, "convenience": 0,
                            "safety": 0, "nature": 0})


class TestBuildReasons:
    """build_reasons 단위 테스트"""

    def test_returns_two_reasons(self):
        """TC-F09: reasons 리스트 길이가 2이다."""
        region = REGIONS[0]
        reasons = build_reasons(region, make_weights(), language="ko")
        assert len(reasons) == 2

    def test_ko_reasons_contain_korean(self):
        """TC-F10: language='ko'일 때 첫 번째 reason에 한글이 포함된다."""
        region = REGIONS[0]
        reasons = build_reasons(region, make_weights(), language="ko")
        has_ko = any("가" <= c <= "힣" for c in reasons[0])
        assert has_ko, f"한글 없음: {reasons[0]}"

    def test_en_reasons_contain_english(self):
        """TC-F11: language='en'일 때 첫 번째 reason에 영문이 포함된다."""
        region = REGIONS[0]
        reasons = build_reasons(region, make_weights(), language="en")
        has_en = any("a" <= c.lower() <= "z" for c in reasons[0])
        assert has_en, f"영문 없음: {reasons[0]}"

    def test_second_reason_contains_tourist_spot_name(self):
        """TC-F12: 두 번째 reason에 tourist_spots[0].name이 포함된다."""
        region = REGIONS[0]
        reasons = build_reasons(region, make_weights(), language="ko")
        spot_name = region.tourist_spots[0].name
        assert spot_name in reasons[1], f"spot={spot_name} not in: {reasons[1]}"

    def test_top_contributing_category_in_first_reason(self):
        """TC-F13: 가중치가 압도적인 카테고리명이 첫 reason에 포함된다."""
        region = REGIONS[0]
        w = make_weights(traffic=0.0, culture=0.9, convenience=0.05,
                         safety=0.025, nature=0.025)
        reasons = build_reasons(region, w, language="ko")
        assert "문화" in reasons[0], f"reason={reasons[0]}"


class TestRankRegions:
    """rank_regions 단위 테스트"""

    def test_returns_correct_count(self):
        """TC-F14: limit 개수만큼 결과를 반환한다."""
        for limit in [1, 3, 5, 10]:
            result = rank_regions(REGIONS, make_weights(), limit=limit)
            assert len(result) == min(limit, len(REGIONS)), f"limit={limit}"

    def test_descending_order(self):
        """TC-F15: 반환 결과가 finalScore 내림차순으로 정렬된다."""
        result = rank_regions(REGIONS, make_weights(), limit=10)
        for i in range(len(result) - 1):
            assert result[i].finalScore >= result[i + 1].finalScore, (
                f"rank{i+1}={result[i].finalScore} < rank{i+2}={result[i+1].finalScore}"
            )

    def test_rank_field_sequential(self):
        """TC-F16: rank 필드가 1부터 연속으로 부여된다."""
        result = rank_regions(REGIONS, make_weights(), limit=5)
        assert [r.rank for r in result] == [1, 2, 3, 4, 5]

    def test_culture_heavy_top_region_has_high_culture_score(self):
        """TC-F17: culture 가중치가 클 때 1위 지역의 culture 점수가 90 이상이다."""
        w = make_weights(traffic=0.025, culture=0.9, convenience=0.025,
                         safety=0.025, nature=0.025)
        result = rank_regions(REGIONS, w, limit=1)
        assert result[0].categoryScores["culture"] >= 90, (
            f"culture={result[0].categoryScores['culture']}"
        )

    def test_score_consistency_with_manual_calc(self):
        """TC-F18: finalScore가 수동 계산값과 일치한다 (±0.1)."""
        w = make_weights(traffic=0.15, culture=0.25, convenience=0.28,
                         safety=0.17, nature=0.15)
        result = rank_regions(REGIONS, w, limit=10)
        for item in result:
            region = next(r for r in REGIONS if r.region_id == item.region_id)
            manual = round(
                sum(region.categoryScores[k] * w[k] for k in w), 1
            )
            assert abs(item.finalScore - manual) <= 0.1, (
                f"{item.region_id}: api={item.finalScore} manual={manual}"
            )
