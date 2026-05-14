"""
TC-E01 ~ TC-E32 : 추천 엔드포인트 통합 테스트

주요 검증 영역:
  - 정상 응답 구조 검증
  - 점수 계산 수학적 정합성
  - 정렬 순서 (내림차순)
  - 가중치 정규화
  - 언어별 reasons 텍스트
  - 입력값 유효성 검사 (422 경계)
  - 프리셋별 추천 결과
  - API 라우팅 prefix
"""
import math
import pytest

CATEGORY_KEYS = {"traffic", "culture", "convenience", "safety", "nature"}
REC_REQUIRED_FIELDS = {
    "rank", "region_id", "region_level", "regionNameKo", "regionNameEn",
    "parentRegionNameKo", "parentLogoKey", "finalScore",
    "categoryScores", "reasons", "touristSpots",
    "latitude", "longitude", "mapX", "mapY", "naverMap",
}
RESP_REQUIRED_FIELDS = {"recommendations", "weights", "preset_id", "region_level", "dataVersion"}


def post_rec(client, payload):
    return client.post("/recommendations", json=payload)


class TestRecommendationsResponseStructure:
    """추천 API 응답 구조 검증"""

    @pytest.fixture(scope="class")
    def resp(self, client):
        return post_rec(client, {
            "preset_id": "default",
            "limit": 5,
            "region_level": "sigungu",
            "language": "ko",
        }).json()

    def test_status_200(self, client):
        """TC-E01: 정상 요청이 HTTP 200을 반환한다."""
        res = post_rec(client, {"preset_id": "default", "limit": 5, "region_level": "sigungu"})
        assert res.status_code == 200

    def test_response_top_level_fields(self, resp):
        """TC-E02: 응답 최상위에 필수 5개 필드가 있다."""
        missing = RESP_REQUIRED_FIELDS - set(resp.keys())
        assert not missing, f"missing={missing}"

    def test_recommendations_count_equals_limit(self, resp):
        """TC-E03: recommendations 배열 길이가 요청한 limit(5)와 같다."""
        assert len(resp["recommendations"]) == 5

    def test_each_recommendation_has_required_fields(self, resp):
        """TC-E04: 각 추천 항목에 필수 필드가 모두 있다."""
        for rec in resp["recommendations"]:
            missing = REC_REQUIRED_FIELDS - set(rec.keys())
            assert not missing, f"rank={rec.get('rank')} missing={missing}"

    def test_weights_has_five_keys(self, resp):
        """TC-E05: 응답 weights에 5개 카테고리 키가 있다."""
        assert set(resp["weights"].keys()) == CATEGORY_KEYS

    def test_preset_id_echoed(self, resp):
        """TC-E06: 응답의 preset_id가 요청값 'default'와 같다."""
        assert resp["preset_id"] == "default"

    def test_region_level_echoed(self, resp):
        """TC-E07: 응답의 region_level이 요청값 'sigungu'와 같다."""
        assert resp["region_level"] == "sigungu"

    def test_data_version_present(self, resp):
        """TC-E08: dataVersion 필드가 존재한다."""
        assert resp.get("dataVersion")

    def test_naver_map_has_urls(self, resp):
        """TC-E09: 각 추천 항목의 naverMap에 webUrl, appUrl이 있다."""
        for rec in resp["recommendations"]:
            nm = rec.get("naverMap", {})
            assert nm.get("webUrl"), f"rank={rec['rank']} naverMap.webUrl 없음"
            assert nm.get("appUrl"), f"rank={rec['rank']} naverMap.appUrl 없음"


class TestRecommendationsScoring:
    """추천 점수 수학적 정합성"""

    @pytest.fixture(scope="class")
    def resp(self, client):
        return post_rec(client, {
            "preset_id": "default",
            "limit": 5,
            "region_level": "sigungu",
            "language": "ko",
        }).json()

    def test_weights_sum_to_one(self, resp):
        """TC-E10: 반환된 weights의 합이 1.0이다 (±0.001)."""
        total = sum(resp["weights"].values())
        assert abs(total - 1.0) < 0.001, f"weights_sum={total}"

    def test_final_score_matches_manual_calculation(self, resp):
        """TC-E11: finalScore가 weights × categoryScores의 수동 계산값과 일치한다 (±0.1)."""
        w = resp["weights"]
        for rec in resp["recommendations"]:
            cs = rec["categoryScores"]
            manual = round(
                cs["traffic"] * w["traffic"] +
                cs["culture"] * w["culture"] +
                cs["convenience"] * w["convenience"] +
                cs["safety"] * w["safety"] +
                cs["nature"] * w["nature"],
                1,
            )
            assert abs(rec["finalScore"] - manual) <= 0.1, (
                f"{rec['regionNameKo']}: api={rec['finalScore']} manual={manual}"
            )

    def test_final_scores_descending(self, resp):
        """TC-E12: recommendations가 finalScore 내림차순으로 정렬되어 있다."""
        scores = [r["finalScore"] for r in resp["recommendations"]]
        for i in range(len(scores) - 1):
            assert scores[i] >= scores[i + 1], f"rank{i+1}={scores[i]} < rank{i+2}={scores[i+1]}"

    def test_rank_sequential(self, resp):
        """TC-E13: rank가 1부터 연속으로 부여된다."""
        ranks = [r["rank"] for r in resp["recommendations"]]
        assert ranks == list(range(1, len(ranks) + 1)), f"ranks={ranks}"

    def test_final_score_in_range_0_100(self, resp):
        """TC-E14: 모든 finalScore가 0 이상 100 이하이다."""
        for rec in resp["recommendations"]:
            assert 0 <= rec["finalScore"] <= 100, (
                f"{rec['regionNameKo']} finalScore={rec['finalScore']}"
            )

    def test_category_scores_in_range_0_100(self, resp):
        """TC-E15: 모든 categoryScores 값이 0 이상 100 이하이다."""
        for rec in resp["recommendations"]:
            for key, val in rec["categoryScores"].items():
                assert 0 <= val <= 100, f"{rec['regionNameKo']}.{key}={val}"


class TestRecommendationsLanguage:
    """언어(language) 파라미터 처리"""

    def test_ko_reasons_contain_korean(self, client):
        """TC-E16: language='ko'일 때 reasons에 한글이 포함된다."""
        resp = post_rec(client, {
            "preset_id": "default", "limit": 1,
            "region_level": "sigungu", "language": "ko",
        }).json()
        reason = resp["recommendations"][0]["reasons"][0]
        has_korean = any("가" <= c <= "힣" for c in reason)
        assert has_korean, f"ko reasons에 한글 없음: {reason}"

    def test_en_reasons_contain_english(self, client):
        """TC-E17: language='en'일 때 reasons에 영문이 포함된다."""
        resp = post_rec(client, {
            "preset_id": "default", "limit": 1,
            "region_level": "sigungu", "language": "en",
        }).json()
        reason = resp["recommendations"][0]["reasons"][0]
        has_en = any("a" <= c.lower() <= "z" for c in reason)
        assert has_en, f"en reasons에 영문 없음: {reason}"

    def test_en_region_name_latin(self, client):
        """TC-E18: language='en'이어도 regionNameKo는 한글이다."""
        resp = post_rec(client, {
            "preset_id": "default", "limit": 1,
            "region_level": "sigungu", "language": "en",
        }).json()
        rec = resp["recommendations"][0]
        has_ko = any("가" <= c <= "힣" for c in rec["regionNameKo"])
        has_en = any("a" <= c.lower() <= "z" for c in rec["regionNameEn"])
        assert has_ko, "regionNameKo에 한글 없음"
        assert has_en, "regionNameEn에 영문 없음"

    def test_reasons_count_two(self, client):
        """TC-E19: 모든 추천 항목에 reasons가 2개이다."""
        resp = post_rec(client, {
            "preset_id": "default", "limit": 5,
            "region_level": "sigungu", "language": "ko",
        }).json()
        for rec in resp["recommendations"]:
            assert len(rec["reasons"]) == 2, (
                f"{rec['regionNameKo']} reasons count={len(rec['reasons'])}"
            )


class TestRecommendationsCustomWeights:
    """커스텀 가중치 처리"""

    def test_culture_heavy_top_culture_region(self, client):
        """TC-E20: culture=0.9 가중치 시 높은 문화점수 지역이 1위가 된다."""
        resp = post_rec(client, {
            "weights": {"traffic": 0.025, "culture": 0.9, "convenience": 0.025,
                        "safety": 0.025, "nature": 0.025},
            "limit": 1, "region_level": "sigungu", "language": "ko",
        }).json()
        rec = resp["recommendations"][0]
        assert rec["categoryScores"]["culture"] >= 90, (
            f"culture-heavy top1의 culture 점수={rec['categoryScores']['culture']}"
        )

    def test_nature_heavy_top_nature_region(self, client):
        """TC-E21: nature=0.9 가중치 시 높은 자연점수 지역이 1위가 된다."""
        resp = post_rec(client, {
            "weights": {"traffic": 0.025, "culture": 0.025, "convenience": 0.025,
                        "safety": 0.025, "nature": 0.9},
            "limit": 1, "region_level": "sigungu", "language": "ko",
        }).json()
        rec = resp["recommendations"][0]
        assert rec["categoryScores"]["nature"] >= 90, (
            f"nature-heavy top1의 nature 점수={rec['categoryScores']['nature']}"
        )

    def test_custom_weights_are_normalized_in_response(self, client):
        """TC-E22: 비정규화 가중치를 전송해도 응답의 weights 합이 1.0이다."""
        resp = post_rec(client, {
            "weights": {"traffic": 10, "culture": 20, "convenience": 30,
                        "safety": 15, "nature": 25},
            "limit": 3, "region_level": "sigungu",
        }).json()
        total = sum(resp["weights"].values())
        assert abs(total - 1.0) < 0.001, f"weights_sum={total}"

    def test_preset_ignored_when_weights_provided(self, client):
        """TC-E23: weights를 명시하면 preset_id가 있어도 커스텀 가중치로 계산된다."""
        custom_w = {"traffic": 0.0, "culture": 1.0, "convenience": 0.0,
                    "safety": 0.0, "nature": 0.0}
        resp = post_rec(client, {
            "preset_id": "default",
            "weights": custom_w,
            "limit": 1, "region_level": "sigungu",
        }).json()
        assert abs(resp["weights"]["culture"] - 1.0) < 0.001


class TestRecommendationsAllPresets:
    """5개 프리셋 전체 검증"""

    @pytest.mark.parametrize("preset_id", [
        "default", "foreign_tourist", "remote_worker",
        "active_senior", "culture_single_couple",
    ])
    def test_each_preset_returns_five_results(self, client, preset_id):
        """TC-E24~E28: 각 프리셋이 5개의 추천을 반환한다."""
        resp = post_rec(client, {
            "preset_id": preset_id,
            "limit": 5, "region_level": "sigungu", "language": "ko",
        }).json()
        assert len(resp["recommendations"]) == 5, f"preset={preset_id}"

    @pytest.mark.parametrize("preset_id", [
        "default", "foreign_tourist", "remote_worker",
        "active_senior", "culture_single_couple",
    ])
    def test_each_preset_weights_sum_to_one(self, client, preset_id):
        """TC-E24~E28 (weights): 각 프리셋 응답의 weights 합이 1.0이다."""
        resp = post_rec(client, {
            "preset_id": preset_id,
            "limit": 5, "region_level": "sigungu",
        }).json()
        total = sum(resp["weights"].values())
        assert abs(total - 1.0) < 0.001, f"preset={preset_id} sum={total}"


class TestRecommendationsValidation:
    """입력값 유효성 검사 — 422 경계 테스트"""

    def test_zero_weights_returns_422(self, client):
        """TC-E29: 가중치를 모두 0으로 전송하면 HTTP 422를 반환한다 (수정 검증)."""
        res = post_rec(client, {
            "weights": {"traffic": 0, "culture": 0, "convenience": 0,
                        "safety": 0, "nature": 0},
            "limit": 3,
        })
        assert res.status_code == 422, f"status={res.status_code}"

    def test_negative_weight_returns_422(self, client):
        """TC-E30: 음수 가중치 전송 시 HTTP 422를 반환한다."""
        res = post_rec(client, {
            "weights": {"traffic": -1, "culture": 0.5, "convenience": 0.2,
                        "safety": 0.2, "nature": 0.1},
            "limit": 3,
        })
        assert res.status_code == 422, f"status={res.status_code}"

    def test_limit_zero_returns_422(self, client):
        """TC-E31: limit=0 전송 시 HTTP 422를 반환한다."""
        res = post_rec(client, {"preset_id": "default", "limit": 0})
        assert res.status_code == 422, f"status={res.status_code}"

    def test_limit_over_max_returns_422(self, client):
        """TC-E32: limit=51 전송 시 HTTP 422를 반환한다 (max=50)."""
        res = post_rec(client, {"preset_id": "default", "limit": 51})
        assert res.status_code == 422, f"status={res.status_code}"

    def test_nonexistent_preset_returns_404(self, client):
        """TC-E33: 존재하지 않는 preset_id 전송 시 HTTP 404를 반환한다."""
        res = post_rec(client, {"preset_id": "NOT_EXIST", "limit": 3})
        assert res.status_code == 404, f"status={res.status_code}"

    def test_limit_one_returns_exactly_one(self, client):
        """TC-E34: limit=1 요청 시 정확히 1개의 결과를 반환한다."""
        resp = post_rec(client, {
            "preset_id": "default", "limit": 1,
            "region_level": "sigungu",
        }).json()
        assert len(resp["recommendations"]) == 1

    def test_limit_50_returns_at_most_ten(self, client):
        """TC-E35: limit=50이지만 데이터가 10개뿐이어서 10개 반환한다."""
        resp = post_rec(client, {
            "preset_id": "default", "limit": 50,
            "region_level": "sigungu",
        }).json()
        assert len(resp["recommendations"]) <= 10


class TestApiPrefixes:
    """API 라우팅 prefix 검증"""

    def test_api_prefix_recommendations(self, client):
        """TC-E36: /api/recommendations가 /recommendations와 동일하게 동작한다."""
        base = post_rec(client, {"preset_id": "default", "limit": 3}).json()
        api_res = client.post("/api/recommendations", json={"preset_id": "default", "limit": 3}).json()
        assert len(base["recommendations"]) == len(api_res["recommendations"])

    def test_api_v1_prefix_recommendations(self, client):
        """TC-E37: /api/v1/recommendations가 /recommendations와 동일하게 동작한다."""
        base = post_rec(client, {"preset_id": "default", "limit": 3}).json()
        v1_res = client.post("/api/v1/recommendations", json={"preset_id": "default", "limit": 3}).json()
        assert len(base["recommendations"]) == len(v1_res["recommendations"])
