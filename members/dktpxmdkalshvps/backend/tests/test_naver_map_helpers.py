import unittest

from main import build_full_region_name, build_naver_map, enrich_region_context


class NaverMapHelperTests(unittest.TestCase):
    def test_sigungu_uses_parent_region_name(self):
        row = {
            "region_id": "41110",
            "region_name_ko": "수원시",
            "region_level": "sigungu",
            "parent_region_name_ko": "경기도",
        }
        self.assertEqual(build_full_region_name(row), "경기도 수원시")
        self.assertEqual(build_naver_map(row)["query"], "경기도 수원시")
        self.assertIn("%EA%B2%BD%EA%B8%B0%EB%8F%84%20%EC%88%98%EC%9B%90%EC%8B%9C", build_naver_map(row)["webUrl"])

    def test_sido_uses_region_name_only(self):
        row = {"region_id": "50", "region_name_ko": "제주특별자치도", "region_level": "sido"}
        self.assertEqual(build_full_region_name(row), "제주특별자치도")
        self.assertEqual(build_naver_map(row)["query"], "제주특별자치도")

    def test_enrich_adds_camel_case_fields(self):
        row = {
            "region_id": "11680",
            "region_name_ko": "강남구",
            "region_name_en": "Gangnam-gu",
            "region_level": "sigungu",
            "parent_region_id": "11",
            "parent_region_name_ko": "서울특별시",
        }
        enriched = enrich_region_context(row)
        self.assertEqual(enriched["regionId"], "11680")
        self.assertEqual(enriched["regionNameKo"], "강남구")
        self.assertEqual(enriched["parentRegionNameKo"], "서울특별시")
        self.assertEqual(enriched["fullRegionNameKo"], "서울특별시 강남구")
        self.assertEqual(enriched["naverMap"]["query"], "서울특별시 강남구")


if __name__ == "__main__":
    unittest.main()
