# MEOMUM — 통합 테스트 및 QA 결과서

| 항목 | 내용 |
|------|------|
| 프로젝트 | MEOMUM (머묾) — 장기체류 관광 지역 추천 서비스 |
| 테스트 일자 | 2026-05-13 |
| 테스트 대상 | Backend (FastAPI) + Frontend (React/Vite) 통합 |
| 테스트 환경 | Python 3.11 · FastAPI 0.136 · Pytest 9.0.3 · Windows 11 |
| 최종 결과 | **116 passed / 0 failed / 0 error** (2.81s) |

---

## 1. 테스트 개요

### 1.1 구성 파일

```
backend/
├── tests/
│   ├── conftest.py                     공통 픽스처
│   ├── test_api_root_health.py         TC-A: 루트·헬스
│   ├── test_api_presets.py             TC-B: 프리셋
│   ├── test_api_regions.py             TC-C: 지역·점수
│   ├── test_api_metrics.py             TC-D: 메트릭·버전
│   ├── test_api_recommendations.py     TC-E: 추천 (핵심)
│   ├── test_unit_recommender.py        TC-F: 추천 로직 단위
│   └── test_unit_schemas.py            TC-G: Pydantic 스키마 단위
└── pytest.ini
```

### 1.2 테스트 분류 및 수량

| 모듈 | 테스트 클래스 | 테스트 수 | 유형 |
|------|-------------|---------|------|
| test_api_root_health | TestRoot, TestHealth | 7 | API 통합 |
| test_api_presets | TestPresets | 7 | API 통합 |
| test_api_regions | TestRegions, TestScores, TestScoreDetail | 18 | API 통합 |
| test_api_metrics | TestMetrics, TestDataVersion | 10 | API 통합 |
| test_api_recommendations | TestRecommendationsResponseStructure, TestRecommendationsScoring, TestRecommendationsLanguage, TestRecommendationsCustomWeights, TestRecommendationsAllPresets, TestRecommendationsValidation, TestApiPrefixes | 37 | API 통합 |
| test_unit_recommender | TestCalculateFinalScore, TestNormalizeDict, TestBuildReasons, TestRankRegions | 18 | 단위 |
| test_unit_schemas | TestWeights, TestRecommendationRequest | 14 | 단위 |
| **합계** | **19개 클래스** | **116** | |

---

## 2. 실행 결과 요약

```
============================= test session info ==============================
platform: win32 — Python 3.11
pytest version: 9.0.3
test root: backend/tests

============================= 116 passed in 2.81s ============================
```

**전체 116개 테스트 PASS — 실패 없음**

---

## 3. 테스트 케이스 상세 결과

### TC-A: 루트 및 헬스 엔드포인트

| TC 번호 | 테스트명 | 결과 | 설명 |
|--------|---------|------|------|
| TC-A01 | test_status_200 | PASS | GET / → HTTP 200 |
| TC-A02 | test_service_field | PASS | body.service = "MEOMUM" |
| TC-A03 | test_status_field_ok | PASS | body.status = "ok" |
| TC-A04 | test_status_200 (health) | PASS | GET /health → HTTP 200 |
| TC-A05 | test_has_status_field | PASS | 응답에 status 필드 존재 |
| TC-A06 | test_has_database_field | PASS | 응답에 database 필드 존재 |
| TC-A07 | test_status_is_ok_or_degraded | PASS | status ∈ {ok, degraded} |

### TC-B: 프리셋

| TC 번호 | 테스트명 | 결과 | 설명 |
|--------|---------|------|------|
| TC-B01 | test_status_200 | PASS | GET /presets → HTTP 200 |
| TC-B02 | test_count_five | PASS | 프리셋 5개 반환 |
| TC-B03 | test_preset_ids_complete | PASS | 5개 ID 모두 포함 |
| TC-B04 | test_each_preset_has_required_fields | PASS | 6개 필수 필드 존재 |
| TC-B05 | test_each_preset_weights_have_five_keys | PASS | 5개 카테고리 키 존재 |
| TC-B06 | test_each_preset_weights_sum_to_one | PASS | 가중치 합 = 1.0 (±0.01) |
| TC-B07 | test_api_prefix_v1_same_result | PASS | /api/v1/presets 동일 결과 |

### TC-C: 지역 및 점수

| TC 번호 | 테스트명 | 결과 | 설명 |
|--------|---------|------|------|
| TC-C01 | test_sigungu_status_200 | PASS | /regions?region_level=sigungu → 200 |
| TC-C02 | test_sigungu_count_ten | PASS | sigungu 10개 반환 |
| TC-C03 | test_sido_returns_empty | PASS | sido → 빈 배열 (mock 미포함 확인) |
| TC-C04 | test_invalid_level_returns_422 | PASS | 잘못된 레벨 → 422 |
| TC-C05 | test_each_region_has_region_level_sigungu | PASS | 모든 지역 level = sigungu |
| TC-C06 | test_each_region_has_coordinates | PASS | 위경도 필드 존재 |
| TC-C07 | test_each_region_has_tourist_spots | PASS | tourist_spots > 0 |
| TC-C08 | test_status_200 (scores) | PASS | GET /scores → 200 |
| TC-C09 | test_count_ten | PASS | 점수 10개 반환 |
| TC-C10 | test_required_fields_present | PASS | 8개 필수 필드 존재 |
| TC-C11 | test_category_scores_have_five_keys | PASS | 카테고리 5개 키 |
| TC-C12 | test_scores_in_range_0_to_100 | PASS | 모든 점수 0~100 범위 |
| TC-C13 | test_known_region_status_200 | PASS | /scores/seoul-jongno → 200 |
| TC-C14 | test_unknown_region_status_404 | PASS | 존재하지 않는 ID → 404 |
| TC-C15 | test_detail_has_metrics | PASS | metrics 배열 존재 |
| TC-C16 | test_detail_has_nine_metrics | PASS | metrics 9개 |
| TC-C17 | test_detail_has_tourist_spots | PASS | tourist_spots 존재 |
| TC-C18 | test_region_detail_alias | PASS | /regions/{id}/details = /scores/{id} |

### TC-D: 메트릭 및 데이터 버전

| TC 번호 | 테스트명 | 결과 | 설명 |
|--------|---------|------|------|
| TC-D01 | test_status_200 (metrics) | PASS | GET /metrics → 200 |
| TC-D02 | test_count_nine | PASS | 지표 9개 반환 |
| TC-D03 | test_metric_ids_complete | PASS | 9개 metric_id 모두 포함 |
| TC-D04 | test_all_categories_covered | PASS | 5개 카테고리 전부 커버 |
| TC-D05 | test_each_metric_has_required_fields | PASS | 6개 필수 필드 존재 |
| TC-D06 | test_metric_categories_valid | PASS | category ∈ 허용된 5개 |
| TC-D07 | test_status_200 (data-version) | PASS | GET /data-versions/latest → 200 |
| TC-D08 | test_version_field_exists | PASS | version 필드 존재 |
| TC-D09 | test_version_format_yyyy_mm_dd | PASS | YYYY-MM-DD 형식 확인 |
| TC-D10 | test_updated_at_field_exists | PASS | updatedAt 필드 존재 |

### TC-E: 추천 엔드포인트 (핵심)

| TC 번호 | 테스트명 | 결과 | 설명 |
|--------|---------|------|------|
| TC-E01 | test_status_200 | PASS | POST /recommendations → 200 |
| TC-E02 | test_response_top_level_fields | PASS | 최상위 5개 필드 존재 |
| TC-E03 | test_recommendations_count_equals_limit | PASS | count = limit(5) |
| TC-E04 | test_each_recommendation_has_required_fields | PASS | 17개 필수 필드 존재 |
| TC-E05 | test_weights_has_five_keys | PASS | weights에 5개 키 |
| TC-E06 | test_preset_id_echoed | PASS | preset_id 요청값 echo |
| TC-E07 | test_region_level_echoed | PASS | region_level echo |
| TC-E08 | test_data_version_present | PASS | dataVersion 존재 |
| TC-E09 | test_naver_map_has_urls | PASS | webUrl, appUrl 존재 |
| TC-E10 | test_weights_sum_to_one | PASS | weights 합 = 1.0 (±0.001) |
| TC-E11 | test_final_score_matches_manual_calculation | PASS | 수동 계산값과 일치 (±0.1) |
| TC-E12 | test_final_scores_descending | PASS | finalScore 내림차순 정렬 |
| TC-E13 | test_rank_sequential | PASS | rank 1부터 연속 부여 |
| TC-E14 | test_final_score_in_range_0_100 | PASS | finalScore ∈ [0, 100] |
| TC-E15 | test_category_scores_in_range_0_100 | PASS | 카테고리 점수 ∈ [0, 100] |
| TC-E16 | test_ko_reasons_contain_korean | PASS | ko 언어 → 한글 포함 |
| TC-E17 | test_en_reasons_contain_english | PASS | en 언어 → 영문 포함 |
| TC-E18 | test_en_region_name_latin | PASS | regionNameKo=한글, regionNameEn=영문 |
| TC-E19 | test_reasons_count_two | PASS | reasons 항상 2개 |
| TC-E20 | test_culture_heavy_top_culture_region | PASS | culture=0.9 → 1위 culture≥90 |
| TC-E21 | test_nature_heavy_top_nature_region | PASS | nature=0.9 → 1위 nature≥90 |
| TC-E22 | test_custom_weights_are_normalized_in_response | PASS | 비정규화 입력 → 합=1.0 |
| TC-E23 | test_preset_ignored_when_weights_provided | PASS | weights 명시 시 preset 무시 |
| TC-E24~E28 | test_each_preset_returns_five_results [×5] | PASS | 5개 프리셋 각 5건 반환 |
| TC-E24~E28 | test_each_preset_weights_sum_to_one [×5] | PASS | 5개 프리셋 weights 합=1.0 |
| TC-E29 | test_zero_weights_returns_422 | PASS | **수정 후 검증: 0 가중치 → 422** |
| TC-E30 | test_negative_weight_returns_422 | PASS | 음수 가중치 → 422 |
| TC-E31 | test_limit_zero_returns_422 | PASS | limit=0 → 422 |
| TC-E32 | test_limit_over_max_returns_422 | PASS | limit=51 → 422 |
| TC-E33 | test_nonexistent_preset_returns_404 | PASS | 없는 preset_id → 404 |
| TC-E34 | test_limit_one_returns_exactly_one | PASS | limit=1 → 결과 1개 |
| TC-E35 | test_limit_50_returns_at_most_ten | PASS | limit=50, 데이터 10개 → 10건 |
| TC-E36 | test_api_prefix_recommendations | PASS | /api/recommendations 동일 |
| TC-E37 | test_api_v1_prefix_recommendations | PASS | /api/v1/recommendations 동일 |

### TC-F: recommender.py 단위 테스트

| TC 번호 | 테스트명 | 결과 | 설명 |
|--------|---------|------|------|
| TC-F01 | test_basic_weighted_sum | PASS | 단순 가중합 정확성 |
| TC-F02 | test_equal_weights_average | PASS | 균등 가중치 = 평균 |
| TC-F03 | test_zero_scores_returns_zero | PASS | 가중치 0 → 결과 0 |
| TC-F04 | test_score_rounded_to_one_decimal | PASS | 소수점 1자리 반올림 |
| TC-F05 | test_single_category_full_weight | PASS | 단일 가중치=1 → 해당 점수 반환 |
| TC-F06 | test_normalized_sum_is_one | PASS | 정규화 합 = 1.0 |
| TC-F07 | test_relative_proportions_preserved | PASS | 균등 → 각 0.2 |
| TC-F08 | test_zero_weights_raises_value_error | PASS | 0 가중치 → ValueError |
| TC-F09 | test_returns_two_reasons | PASS | reasons = 2개 |
| TC-F10 | test_ko_reasons_contain_korean | PASS | ko → 한글 포함 |
| TC-F11 | test_en_reasons_contain_english | PASS | en → 영문 포함 |
| TC-F12 | test_second_reason_contains_tourist_spot_name | PASS | 2번째 reason에 관광지명 포함 |
| TC-F13 | test_top_contributing_category_in_first_reason | PASS | 주요 카테고리명 첫 reason 포함 |
| TC-F14 | test_returns_correct_count | PASS | limit 수 준수 |
| TC-F15 | test_descending_order | PASS | finalScore 내림차순 |
| TC-F16 | test_rank_field_sequential | PASS | rank 1~5 연속 |
| TC-F17 | test_culture_heavy_top_region_has_high_culture_score | PASS | culture 압도 → 고점수 지역 1위 |
| TC-F18 | test_score_consistency_with_manual_calc | PASS | 수동 계산값 일치 (전 10개 지역) |

### TC-G: schemas.py 단위 테스트

| TC 번호 | 테스트명 | 결과 | 설명 |
|--------|---------|------|------|
| TC-G01 | test_valid_weights_created | PASS | 유효 가중치 객체 생성 |
| TC-G02 | test_negative_weight_raises_validation_error | PASS | 음수 → ValidationError |
| TC-G03 | test_normalized_sum_is_one | PASS | normalized() 합 = 1.0 |
| TC-G04 | test_normalized_zero_raises_value_error | PASS | 0 → ValueError |
| TC-G05 | test_normalized_equal_weights | PASS | 균등 → 각 0.2 |
| TC-G06 | test_normalized_single_nonzero | PASS | 단일 양수 → 1.0 |
| TC-G07 | test_normalized_returns_weights_instance | PASS | Weights 인스턴스 반환 |
| TC-G08 | test_default_values | PASS | 기본값 (default, 5, sigungu, ko) |
| TC-G09 | test_limit_minimum_boundary | PASS | limit=1 허용 |
| TC-G10 | test_limit_maximum_boundary | PASS | limit=50 허용 |
| TC-G11 | test_limit_zero_raises | PASS | limit=0 → ValidationError |
| TC-G12 | test_limit_over_max_raises | PASS | limit=51 → ValidationError |
| TC-G13 | test_invalid_region_level_raises | PASS | 잘못된 레벨 → ValidationError |
| TC-G14 | test_invalid_language_raises | PASS | ja 언어 → ValidationError |

---

## 4. 버그 수정 내역

통합 테스트 과정에서 발견·수정된 4건의 버그입니다.

### BUG-01: 가중치 전체 0 → HTTP 500 (Critical)

| 항목 | 내용 |
|------|------|
| **파일** | `backend/app/main.py:108` |
| **증상** | `POST /recommendations` 에 `{weights: 모두 0}` 전송 시 HTTP **500** 반환 |
| **원인** | `payload.weights.normalized()` 내부 `ValueError`가 FastAPI 예외 핸들러에 도달하기 전 Python 예외로 전파됨 |
| **수정** | `try/except ValueError` 추가 후 `HTTPException(status_code=422)` raise |
| **검증 TC** | TC-E29, TC-G04, TC-F08 |

```python
# 수정 전
if payload.weights:
    weights = payload.weights.normalized().model_dump()

# 수정 후
if payload.weights:
    try:
        weights = payload.weights.normalized().model_dump()
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
```

---

### BUG-02: `.env` 에 FRONTEND_ORIGINS 중복 선언 (Config)

| 항목 | 내용 |
|------|------|
| **파일** | `backend/.env` |
| **증상** | `FRONTEND_ORIGINS` 키가 두 번 선언됨 — 4번째 줄(개발용)이 10번째 줄(운영용)에 덮어씌워지나, 순서가 바뀔 경우 운영 URL이 누락됨 |
| **수정** | 중복 제거, 개발+운영 origins를 단일 라인으로 통합 |

```ini
# 수정 전 (중복 존재)
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173   # ← 4번째 줄
...
FRONTEND_ORIGINS=http://localhost:5173,...,https://meomum.kr   # ← 10번째 줄

# 수정 후 (단일화)
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://meomum.kr
```

---

### BUG-03: `calculate_final_score` 이중 호출 (Performance)

| 항목 | 내용 |
|------|------|
| **파일** | `backend/app/services/recommender.py:48` |
| **증상** | `rank_regions` 함수에서 정렬 시 한 번, `RecommendationItem` 생성 시 한 번 — 지역당 2회 호출 |
| **수정** | 정렬 전 `(score, region)` 튜플 목록으로 미리 계산하여 재사용 |

```python
# 수정 전
ranked = sorted(regions, key=lambda r: calculate_final_score(r, weights), ...)
for idx, region in enumerate(ranked, start=1):
    ...finalScore=calculate_final_score(region, weights),  # 재계산

# 수정 후
scored = [(calculate_final_score(r, weights), r) for r in regions]
ranked = sorted(scored, key=lambda x: x[0], reverse=True)[:limit]
for idx, (final_score, region) in enumerate(ranked, start=1):
    ...finalScore=final_score,  # 재사용
```

---

### BUG-04: `DetailModal` 추천 이유 하드코딩 (UI)

| 항목 | 내용 |
|------|------|
| **파일** | `frontend/src/App.jsx:1053` |
| **증상** | 지역 상세 모달의 설명 문구가 항상 동일한 하드코딩 텍스트 표시 — API에서 받아온 `reasons` 배열이 무시됨 |
| **수정** | `region.reasons?.[0]`를 우선 표시, 없을 때만 폴백 텍스트 사용 |

```jsx
// 수정 전
{isEnglish ? "High contribution..." : "생활편의와 문화·여가·디지털..."}

// 수정 후
{region.reasons?.[0] || (isEnglish ? "High contribution..." : "생활편의와 문화·여가·디지털...")}
```

---

## 5. 성능 측정 결과

테스트 환경: 로컬 개발 서버 (uvicorn), 요청 20회 측정

| 엔드포인트 | avg (ms) | p95 (ms) | 평가 |
|----------|---------|---------|------|
| GET /health | 408.7 | 1638.1 | ⚠️ 외부 Supabase 호출 지연 |
| GET /presets | 1.8 | 3.3 | ✅ 우수 |
| GET /regions | 4.9 | 5.8 | ✅ 우수 |
| GET /scores | 2.2 | 4.9 | ✅ 우수 |
| GET /scores/{id} | 5.4 | 36.5 | ✅ 양호 |
| POST /recommendations | 2.2 | 7.4 | ✅ 우수 |
| POST /recommendations (custom) | 1.4 | 3.1 | ✅ 우수 |
| GET /data-versions/latest | 1.0 | 2.1 | ✅ 우수 |

> **주의:** `/health`는 외부 Supabase REST API로 실제 네트워크 요청을 발생시켜 평균 408ms, 최대 1.6초가 소요됩니다. 모니터링 시스템에서 주기적으로 호출하거나 프론트엔드에서 직접 호출하는 것은 피해야 합니다.

---

## 6. 잔존 개선 권고 사항 (미수정)

발견되었으나 이번 QA 사이클에서 수정 범위 외로 분류된 사항입니다.

| 우선순위 | 분류 | 위치 | 내용 |
|---------|------|------|------|
| 중 | Dead Code | `frontend/src/hooks/useAppState.js` | `App.jsx`에서 미사용. `App.jsx`가 동일 기능의 state 관리를 인라인으로 중복 구현 중. |
| 중 | Dead Code | `frontend/src/App.jsx:3` | `koreaMapImage` import 후 JSX에서 미사용 — 번들에 불필요한 이미지 포함. |
| 중 | 데이터 불일치 | `frontend/src/App.jsx:26~56` | 프론트엔드 `PRESETS` 가중치가 백엔드 `PRESETS`와 불일치. (예: standard.culture=0.20 ≠ backend default.culture=0.25). API 폴백 실패 시 프론트엔드 로컬 계산 결과가 달라짐. |
| 중 | 구현 미완성 | `backend/app/services/repository.py` | 클래스 주석에 "Supabase 우선 사용"이라 명시되어 있으나, 실제 데이터 조회는 전부 `mock_data.py`만 사용. Supabase 연동 로직이 `health()` 외에는 구현되지 않음. |
| 하 | 데이터 공백 | `backend/app/data/mock_data.py` | `region_level="sido"` 지역 데이터 없음. `GET /regions?region_level=sido`가 항상 빈 배열 반환. |
| 하 | UI | `frontend/src/App.jsx:1205` | `Contact` 폼 전송 버튼이 실제 API 없이 UI 상태만 변경 (`sent=true`). |

---

## 7. 테스트 커버리지 요약

| 레이어 | 검증 영역 | 커버 여부 |
|--------|---------|---------|
| API 라우팅 | 모든 엔드포인트 정상 응답 | ✅ |
| API 라우팅 | `/`, `/api`, `/api/v1` 3가지 prefix | ✅ |
| 입력 유효성 | 422 경계값 (limit 0/51, 음수·0 가중치) | ✅ |
| 입력 유효성 | 404 (없는 ID, 없는 preset) | ✅ |
| 비즈니스 로직 | 가중치 합 정규화 | ✅ |
| 비즈니스 로직 | finalScore 수동 재계산 일치 | ✅ |
| 비즈니스 로직 | 내림차순 정렬·rank 연속성 | ✅ |
| 비즈니스 로직 | 언어별 reasons 텍스트 | ✅ |
| 비즈니스 로직 | 가중치 압도 시 최고점 지역 선택 | ✅ |
| 스키마 | Pydantic 모델 유효성 경계값 | ✅ |
| 버그 수정 | BUG-01~04 회귀 검증 | ✅ |
| 성능 | 응답 시간 측정 (n=20) | ✅ |
| 프론트엔드 자동화 | E2E / 브라우저 테스트 | ❌ (범위 외) |
| DB (Supabase 실 데이터) | 실제 Supabase 쿼리 통합 | ❌ (mock 전용) |
