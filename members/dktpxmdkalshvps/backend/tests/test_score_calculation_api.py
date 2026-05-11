import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

import main
from main import app, calculate_metric_scores_from_rows


class ScoreCalculationHelperTests(unittest.TestCase):
    def test_calculates_min_max_reverse_and_correction_scores(self):
        rows = [
            {
                "region_id": "41110",
                "region_level": "sigungu",
                "category_id": "traffic",
                "metric_id": "bus_accessibility",
                "raw_value": 10,
                "direction": "higher_is_better",
                "normalization_method": "min_max",
                "is_score_metric": True,
            },
            {
                "region_id": "11680",
                "region_level": "sigungu",
                "category_id": "traffic",
                "metric_id": "bus_accessibility",
                "raw_value": 20,
                "direction": "higher_is_better",
                "normalization_method": "min_max",
                "is_score_metric": True,
            },
            {
                "region_id": "41110",
                "region_level": "sigungu",
                "category_id": "nature",
                "metric_id": "pm10",
                "raw_value": 30,
                "direction": "lower_is_better",
                "normalization_method": "reverse_min_max",
                "is_score_metric": True,
            },
            {
                "region_id": "11680",
                "region_level": "sigungu",
                "category_id": "nature",
                "metric_id": "pm10",
                "raw_value": 60,
                "direction": "lower_is_better",
                "normalization_method": "reverse_min_max",
                "is_score_metric": True,
            },
            {
                "region_id": "41110",
                "region_level": "sigungu",
                "category_id": "auxiliary",
                "metric_id": "population_density",
                "raw_value": 1000,
                "direction": "correction",
                "normalization_method": "correction",
                "is_score_metric": False,
            },
        ]

        computed, summary = calculate_metric_scores_from_rows(rows)
        by_key = {(row["region_id"], row["metric_id"]): row for row in computed}

        self.assertEqual(by_key[("41110", "bus_accessibility")]["score_100"], 0.0)
        self.assertEqual(by_key[("11680", "bus_accessibility")]["score_100"], 100.0)
        self.assertEqual(by_key[("41110", "pm10")]["score_100"], 100.0)
        self.assertEqual(by_key[("11680", "pm10")]["score_100"], 0.0)
        self.assertIsNone(by_key[("41110", "population_density")]["score_100"])
        self.assertEqual(summary["computed_rows"], 5)
        self.assertEqual(summary["metric_count"], 3)


class ScoreCalculationEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_dry_run_calculates_sigungu_scores_from_stg_rows(self):
        source_rows = [
            {
                "region_id": "41110",
                "region_level": "sigungu",
                "region_name": "수원시",
                "category_id": "traffic",
                "metric_id": "bus_accessibility",
                "raw_value": 10,
                "cleaned_value": 10,
                "unit": "개/만명",
                "direction": "higher_is_better",
                "normalization_method": "min_max",
                "is_outlier": False,
                "source_file": "test.csv",
            },
            {
                "region_id": "11680",
                "region_level": "sigungu",
                "region_name": "강남구",
                "category_id": "traffic",
                "metric_id": "bus_accessibility",
                "raw_value": 20,
                "cleaned_value": 20,
                "unit": "개/만명",
                "direction": "higher_is_better",
                "normalization_method": "min_max",
                "is_outlier": False,
                "source_file": "test.csv",
            },
        ]

        async def fake_supa_get(path, params=None):
            if path == "stg_region_metric_values":
                self.assertEqual(params["region_level"], "eq.sigungu")
                return source_rows
            if path == "metrics":
                return []
            raise AssertionError(f"unexpected path: {path}")

        with patch.object(main, "supa_get", side_effect=fake_supa_get), patch.object(
            main, "supa_post", new_callable=AsyncMock
        ) as mock_post:
            response = self.client.post(
                "/api/v1/score-calculations/region-metrics",
                json={"region_level": "sigungu", "apply": False, "preview_limit": 10},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertFalse(body["applied"])
        self.assertEqual(body["summary"]["computed_rows"], 2)
        self.assertEqual(body["summary"]["metrics"]["bus_accessibility"]["score_count"], 2)
        self.assertEqual(body["preview"][0]["score_100"], 100.0)  # 11680 sorts before 41110
        mock_post.assert_not_called()

    def test_recommendations_use_region_level_filter(self):
        sample_view_rows = [
            {
                "region_id": "41110",
                "region_name_ko": "수원시",
                "region_level": "sigungu",
                "parent_region_name_ko": "경기도",
                "full_region_name_ko": "경기도 수원시",
                "category_id": "traffic",
                "category_name_ko": "교통",
                "metric_id": "bus_accessibility",
                "score_100": 90,
            },
            {
                "region_id": "41110",
                "region_name_ko": "수원시",
                "region_level": "sigungu",
                "parent_region_name_ko": "경기도",
                "full_region_name_ko": "경기도 수원시",
                "category_id": "culture",
                "category_name_ko": "문화",
                "metric_id": "public_wifi",
                "score_100": 80,
            },
        ]

        async def fake_scores(params):
            self.assertEqual(params["region_level"], "eq.sigungu")
            return sample_view_rows

        with patch.object(main, "get_region_metric_scores_from_view", side_effect=fake_scores):
            response = self.client.post(
                "/api/v1/recommendations",
                json={"region_level": "sigungu", "limit": 5},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["count"], 1)
        self.assertEqual(body["recommendations"][0]["level"], "sigungu")
        self.assertEqual(body["recommendations"][0]["fullRegionNameKo"], "경기도 수원시")


if __name__ == "__main__":
    unittest.main()
