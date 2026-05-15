from app.models.schemas import Preset, Region, MetricValue, TouristSpot, NaverMap, MetricMetadata

DATA_VERSION = "2026-05-11"

PRESETS = [
    Preset(
        preset_id="default",
        name_ko="표준 체류형",
        name_en="Standard Stay",
        description_ko="장기체류관광 기본 권장값",
        description_en="Balanced recommendation for long stays",
        weights={"traffic": 0.15, "culture": 0.25, "convenience": 0.28, "safety": 0.17, "nature": 0.15},
    ),
    Preset(
        preset_id="foreign_tourist",
        name_ko="해외 관광객",
        name_en="Foreign Tourist",
        description_ko="여가·관광·문화 및 통신 중시",
        description_en="Prioritizes leisure, culture, tourism and connectivity",
        weights={"traffic": 0.10, "culture": 0.30, "convenience": 0.25, "safety": 0.18, "nature": 0.17},
    ),
    Preset(
        preset_id="remote_worker",
        name_ko="디지털 노마드",
        name_en="Digital Nomad",
        description_ko="통신·의료·생활 인프라 중시",
        description_en="Prioritizes connectivity, healthcare and convenience",
        weights={"traffic": 0.18, "culture": 0.22, "convenience": 0.30, "safety": 0.15, "nature": 0.15},
    ),
    Preset(
        preset_id="active_senior",
        name_ko="액티브 시니어",
        name_en="Active Senior",
        description_ko="문화·자연·의료 중시",
        description_en="Prioritizes culture, nature and healthcare",
        weights={"traffic": 0.12, "culture": 0.28, "convenience": 0.25, "safety": 0.15, "nature": 0.20},
    ),
    Preset(
        preset_id="culture_single_couple",
        name_ko="나홀로 문화형",
        name_en="Solo Cultural",
        description_ko="문화·여가 최고 우선",
        description_en="Prioritizes culture and leisure",
        weights={"traffic": 0.15, "culture": 0.32, "convenience": 0.23, "safety": 0.12, "nature": 0.18},
    ),
]

METRIC_METADATA = [
    MetricMetadata(metric_id="bus_accessibility", category="traffic", name_ko="버스정류장 접근성", name_en="Bus stop accessibility", unit="개/만 명", source="국토교통부", data_level="시군구", description="대중교통 접근성을 평가합니다.", year="2025"),
    MetricMetadata(metric_id="rail_accessibility", category="traffic", name_ko="철도역 접근성", name_en="Rail station accessibility", unit="개/만 명", source="국토교통부", data_level="시군구", description="철도 기반 장거리 이동 접근성을 평가합니다.", year="2025"),
    MetricMetadata(metric_id="tourism_lodging", category="culture", name_ko="관광숙박시설", name_en="Tourist accommodation", unit="개소", source="한국관광공사", data_level="시군구", description="장기체류 관광 숙박 기반을 평가합니다.", year="2025"),
    MetricMetadata(metric_id="public_wifi", category="culture", name_ko="공공 와이파이", name_en="Public Wi-Fi", unit="개소", source="공공데이터포털", data_level="시군구", description="디지털 체류 편의성을 평가합니다.", year="2025"),
    MetricMetadata(metric_id="clinics", category="convenience", name_ko="병의원", name_en="Clinics", unit="개소", source="건강보험심사평가원", data_level="시군구", description="의료 접근성을 평가합니다.", year="2025"),
    MetricMetadata(metric_id="pharmacies", category="convenience", name_ko="약국", name_en="Pharmacies", unit="개소", source="건강보험심사평가원", data_level="시군구", description="상비 의료 접근성을 평가합니다.", year="2025"),
    MetricMetadata(metric_id="safety_index", category="safety", name_ko="지역안전지수", name_en="Local safety index", unit="상대점수", source="행정안전부", data_level="시군구", description="교통사고, 화재, 범죄, 생활안전 등을 종합합니다.", year="2025"),
    MetricMetadata(metric_id="parks", category="nature", name_ko="도시공원", name_en="Urban parks", unit="개소", source="국토교통부", data_level="시군구", description="생활권 내 공원 접근성을 평가합니다.", year="2025"),
    MetricMetadata(metric_id="pm10", category="nature", name_ko="미세먼지 PM10", name_en="PM10 air quality", unit="㎍/m³", source="에어코리아", data_level="시군구", description="낮을수록 좋은 원천 지표를 방향 보정한 상대점수입니다.", year="2025"),
]


def metric(metric_id, score, raw):
    meta = next(m for m in METRIC_METADATA if m.metric_id == metric_id)
    return MetricValue(
        metric_id=meta.metric_id,
        metric_name_ko=meta.name_ko,
        metric_name_en=meta.name_en,
        category=meta.category,
        score_100=score,
        raw_value=raw,
        unit=meta.unit,
        source=meta.source,
        year=meta.year,
    )


def naver(query):
    encoded = query.replace(" ", "%20")
    return NaverMap(
        query=query,
        webUrl=f"https://map.naver.com/p/search/{encoded}",
        appUrl=f"nmap://search?query={encoded}&appname=meomum",
    )

REGIONS = [
    Region(
        region_id="seoul-jongno", region_level="sigungu", region_name_ko="서울특별시 종로구", region_name_en="Jongno-gu, Seoul", parent_region_id="seoul", parent_region_name_ko="서울특별시", parent_logo_key="Seoul",
        latitude=37.5735, longitude=126.9789, map_x=34, map_y=19,
        categoryScores={"traffic": 92, "culture": 96, "convenience": 90, "safety": 72, "nature": 55},
        metrics=[metric("bus_accessibility", 94, 42.3), metric("rail_accessibility", 91, 8.0), metric("tourism_lodging", 93, 210), metric("public_wifi", 88, 350), metric("clinics", 89, 310), metric("pharmacies", 91, 120), metric("safety_index", 72, 3.1), metric("parks", 65, 44), metric("pm10", 45, 37.1)],
        tourist_spots=[TouristSpot(name="경복궁", type="역사", description="조선 왕궁과 한옥 문화 체험에 적합합니다."), TouristSpot(name="북촌한옥마을", type="문화", description="도보 체류형 관광 동선이 좋습니다."), TouristSpot(name="인사동", type="문화거리", description="전통 공예와 카페, 갤러리를 함께 즐길 수 있습니다.")],
        naverMap=naver("서울 종로구 관광지"),
    ),
    Region(
        region_id="busan-haeundae", region_level="sigungu", region_name_ko="부산광역시 해운대구", region_name_en="Haeundae-gu, Busan", parent_region_id="busan", parent_region_name_ko="부산광역시", parent_logo_key="Busan",
        latitude=35.1631, longitude=129.1636, map_x=79, map_y=54,
        categoryScores={"traffic": 82, "culture": 91, "convenience": 88, "safety": 70, "nature": 84},
        metrics=[metric("bus_accessibility", 80, 33.8), metric("rail_accessibility", 78, 5.4), metric("tourism_lodging", 98, 420), metric("public_wifi", 83, 260), metric("clinics", 86, 250), metric("pharmacies", 84, 96), metric("safety_index", 70, 3.3), metric("parks", 82, 57), metric("pm10", 78, 28.0)],
        tourist_spots=[TouristSpot(name="해운대해수욕장", type="자연", description="해변 체류와 휴양형 관광에 적합합니다."), TouristSpot(name="동백섬", type="산책", description="바다 전망 산책로 접근성이 좋습니다."), TouristSpot(name="마린시티", type="야경", description="야경과 식음 공간이 풍부합니다.")],
        naverMap=naver("부산 해운대구 관광지"),
    ),
    Region(
        region_id="gangwon-gangneung", region_level="sigungu", region_name_ko="강원도 강릉시", region_name_en="Gangneung-si, Gangwon", parent_region_id="gangwon", parent_region_name_ko="강원도", parent_logo_key="Gangwon",
        latitude=37.7519, longitude=128.8761, map_x=61, map_y=18,
        categoryScores={"traffic": 62, "culture": 88, "convenience": 68, "safety": 74, "nature": 97},
        metrics=[metric("bus_accessibility", 62, 24.5), metric("rail_accessibility", 69, 2.8), metric("tourism_lodging", 88, 290), metric("public_wifi", 72, 145), metric("clinics", 63, 118), metric("pharmacies", 66, 52), metric("safety_index", 74, 2.8), metric("parks", 90, 73), metric("pm10", 96, 20.7)],
        tourist_spots=[TouristSpot(name="경포대", type="자연", description="호수와 바다를 함께 즐기는 장기체류형 관광지입니다."), TouristSpot(name="안목해변", type="카페거리", description="카페와 해변 산책이 결합된 체류 동선이 좋습니다."), TouristSpot(name="오죽헌", type="역사", description="역사 문화 탐방 수요에 적합합니다.")],
        naverMap=naver("강릉시 관광지"),
    ),
    Region(
        region_id="jeju-jeju", region_level="sigungu", region_name_ko="제주특별자치도 제주시", region_name_en="Jeju-si, Jeju", parent_region_id="jeju", parent_region_name_ko="제주특별자치도", parent_logo_key="Jeju",
        latitude=33.4996, longitude=126.5312, map_x=24, map_y=91,
        categoryScores={"traffic": 65, "culture": 86, "convenience": 75, "safety": 76, "nature": 100},
        metrics=[metric("bus_accessibility", 65, 26.1), metric("rail_accessibility", 0, 0), metric("tourism_lodging", 94, 510), metric("public_wifi", 71, 180), metric("clinics", 72, 170), metric("pharmacies", 75, 88), metric("safety_index", 76, 2.7), metric("parks", 98, 98), metric("pm10", 100, 18.9)],
        tourist_spots=[TouristSpot(name="용두암", type="자연", description="도심 접근성이 좋은 자연 관광지입니다."), TouristSpot(name="동문시장", type="시장", description="식도락과 생활 편의가 결합된 관광지입니다."), TouristSpot(name="한라산 국립공원", type="자연", description="장기 체류 중 자연 탐방에 적합합니다.")],
        naverMap=naver("제주시 관광지"),
    ),
    Region(
        region_id="gyeonggi-suwon", region_level="sigungu", region_name_ko="경기도 수원시", region_name_en="Suwon-si, Gyeonggi", parent_region_id="gyeonggi", parent_region_name_ko="경기도", parent_logo_key="Gyeonggi",
        latitude=37.2636, longitude=127.0286, map_x=43, map_y=25,
        categoryScores={"traffic": 86, "culture": 82, "convenience": 92, "safety": 78, "nature": 63},
        metrics=[metric("bus_accessibility", 88, 39.0), metric("rail_accessibility", 84, 6.0), metric("tourism_lodging", 70, 120), metric("public_wifi", 82, 210), metric("clinics", 95, 420), metric("pharmacies", 90, 160), metric("safety_index", 78, 2.6), metric("parks", 70, 64), metric("pm10", 56, 34.2)],
        tourist_spots=[TouristSpot(name="수원화성", type="세계유산", description="도보 탐방과 야간 관광에 적합합니다."), TouristSpot(name="화성행궁", type="역사", description="역사 체험과 문화 프로그램 접근성이 좋습니다."), TouristSpot(name="광교호수공원", type="공원", description="장기체류 중 산책과 휴식에 적합합니다.")],
        naverMap=naver("수원시 관광지"),
    ),
    Region(
        region_id="jeonbuk-jeonju", region_level="sigungu", region_name_ko="전북특별자치도 전주시", region_name_en="Jeonju-si, Jeonbuk", parent_region_id="jeonbuk", parent_region_name_ko="전북특별자치도", parent_logo_key="Jeonbuk",
        latitude=35.8242, longitude=127.1480, map_x=43, map_y=51,
        categoryScores={"traffic": 70, "culture": 95, "convenience": 76, "safety": 74, "nature": 72},
        metrics=[metric("bus_accessibility", 70, 27.6), metric("rail_accessibility", 66, 2.6), metric("tourism_lodging", 86, 190), metric("public_wifi", 79, 174), metric("clinics", 78, 210), metric("pharmacies", 77, 93), metric("safety_index", 74, 2.8), metric("parks", 74, 61), metric("pm10", 70, 30.5)],
        tourist_spots=[TouristSpot(name="전주한옥마을", type="문화", description="전통문화와 식도락이 결합된 대표 체류지입니다."), TouristSpot(name="경기전", type="역사", description="도심 내 역사 탐방지입니다."), TouristSpot(name="남부시장", type="시장", description="야시장과 로컬 먹거리 탐색에 적합합니다.")],
        naverMap=naver("전주시 관광지"),
    ),
    Region(
        region_id="gyeongbuk-gyeongju", region_level="sigungu", region_name_ko="경상북도 경주시", region_name_en="Gyeongju-si, Gyeongbuk", parent_region_id="gyeongsangbuk", parent_region_name_ko="경상북도", parent_logo_key="Gyeongsangbuk",
        latitude=35.8562, longitude=129.2247, map_x=70, map_y=49,
        categoryScores={"traffic": 64, "culture": 98, "convenience": 66, "safety": 80, "nature": 82},
        metrics=[metric("bus_accessibility", 63, 23.3), metric("rail_accessibility", 65, 2.9), metric("tourism_lodging", 92, 260), metric("public_wifi", 74, 155), metric("clinics", 65, 125), metric("pharmacies", 67, 58), metric("safety_index", 80, 2.3), metric("parks", 84, 75), metric("pm10", 79, 27.5)],
        tourist_spots=[TouristSpot(name="불국사", type="세계유산", description="역사문화 중심 장기체류 관광지입니다."), TouristSpot(name="동궁과 월지", type="야경", description="야간 산책과 사진 명소로 적합합니다."), TouristSpot(name="대릉원", type="역사", description="도보 문화 탐방 동선이 좋습니다.")],
        naverMap=naver("경주시 관광지"),
    ),
    Region(
        region_id="jeonnam-yeosu", region_level="sigungu", region_name_ko="전라남도 여수시", region_name_en="Yeosu-si, Jeonnam", parent_region_id="jeollanam", parent_region_name_ko="전라남도", parent_logo_key="Jeollanam",
        latitude=34.7604, longitude=127.6622, map_x=51, map_y=66,
        categoryScores={"traffic": 58, "culture": 87, "convenience": 65, "safety": 77, "nature": 94},
        metrics=[metric("bus_accessibility", 57, 21.2), metric("rail_accessibility", 61, 2.1), metric("tourism_lodging", 90, 310), metric("public_wifi", 69, 132), metric("clinics", 64, 103), metric("pharmacies", 66, 44), metric("safety_index", 77, 2.6), metric("parks", 86, 70), metric("pm10", 93, 21.5)],
        tourist_spots=[TouristSpot(name="여수밤바다", type="야경", description="야간 체류형 관광 만족도가 높습니다."), TouristSpot(name="오동도", type="자연", description="해안 산책과 자연 감상에 적합합니다."), TouristSpot(name="돌산공원", type="전망", description="도시와 바다 조망이 우수합니다.")],
        naverMap=naver("여수시 관광지"),
    ),
    Region(
        region_id="incheon-jung", region_level="sigungu", region_name_ko="인천광역시 중구", region_name_en="Jung-gu, Incheon", parent_region_id="incheon", parent_region_name_ko="인천광역시", parent_logo_key="Incheon",
        latitude=37.4737, longitude=126.6215, map_x=27, map_y=25,
        categoryScores={"traffic": 78, "culture": 80, "convenience": 74, "safety": 68, "nature": 66},
        metrics=[metric("bus_accessibility", 76, 30.0), metric("rail_accessibility", 82, 4.8), metric("tourism_lodging", 84, 220), metric("public_wifi", 77, 155), metric("clinics", 71, 122), metric("pharmacies", 73, 51), metric("safety_index", 68, 3.5), metric("parks", 65, 38), metric("pm10", 61, 33.1)],
        tourist_spots=[TouristSpot(name="차이나타운", type="문화거리", description="식도락과 역사문화 탐방에 적합합니다."), TouristSpot(name="월미도", type="해양", description="바다 전망과 레저 활동 접근성이 좋습니다."), TouristSpot(name="개항장거리", type="역사", description="근대문화 산책 동선이 우수합니다.")],
        naverMap=naver("인천 중구 관광지"),
    ),
    Region(
        region_id="daejeon-yuseong", region_level="sigungu", region_name_ko="대전광역시 유성구", region_name_en="Yuseong-gu, Daejeon", parent_region_id="daejeon", parent_region_name_ko="대전광역시", parent_logo_key="Daejeon",
        latitude=36.3622, longitude=127.3563, map_x=46, map_y=40,
        categoryScores={"traffic": 73, "culture": 72, "convenience": 88, "safety": 82, "nature": 76},
        metrics=[metric("bus_accessibility", 74, 28.5), metric("rail_accessibility", 72, 3.2), metric("tourism_lodging", 68, 110), metric("public_wifi", 75, 162), metric("clinics", 90, 260), metric("pharmacies", 86, 98), metric("safety_index", 82, 2.2), metric("parks", 78, 66), metric("pm10", 74, 29.3)],
        tourist_spots=[TouristSpot(name="유성온천", type="휴양", description="온천 체류와 휴식에 적합합니다."), TouristSpot(name="국립중앙과학관", type="전시", description="가족·교육형 관광 수요에 좋습니다."), TouristSpot(name="엑스포과학공원", type="공원", description="산책과 전시 관람 동선이 결합됩니다.")],
        naverMap=naver("대전 유성구 관광지"),
    ),
]
