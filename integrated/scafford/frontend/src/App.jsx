import { useEffect, useMemo, useState } from "react";
import "./App.css";
import logoImage from "./assets/meomum-logo.png";
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from "react-simple-maps";
import { Tooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css"; // 🚨 이 줄을 꼭 추가해 주세요!
import { geoCentroid } from "d3-geo"; // 🚨 자동으로 땅 가운데를 찾아주는 도구 추가!

const HELP_HERO_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuDGzN9jxwD0VvfAWl47Z7mDWFASDKBptm0hNNxZSayvGZ5_Kuhdoe8XLA9af-Jk8v1fsOm-kILtg1Bs5wIeZoPZemMbbCV3BQXaKacQb92bm0Ys28I6kJT958mEBDTI0IJqx4_U-aMyNoMlH1yOgqcvCvK3LrFa92SeAOLMMjX6VM0t0KpIo4r7pLFICZL7jXgBC1ba1oeXOsZLh-ImK5I6bhlEaEbI-SyNI7C7LcTR3xXdpx2F5kjSRqcZ-gc9RgUuy86C35phT52P";

const CATEGORIES = [
  { key: "traffic", ko: "교통", en: "Traffic", icon: "🚗" },
  { key: "culture", ko: "문화·여가·디지털", en: "Culture", icon: "🏛️" },
  { key: "convenience", ko: "생활편의", en: "Convenience", icon: "🏠" },
  { key: "safety", ko: "안전", en: "Safety", icon: "🛡️" },
  { key: "nature", ko: "자연", en: "Nature", icon: "🌿" },
];

const MODES = [
  { key: "detail", ko: "상세", en: "Detail" },
  { key: "simple", ko: "간편", en: "Simple" },
  { key: "senior", ko: "시니어", en: "Senior" },
];

const PRESETS = {
  standard: {
    ko: "표준 체류형",
    en: "Standard",
    icon: "♡",
    weights: { traffic: 15, culture: 25, convenience: 28, safety: 17, nature: 15 },
  },
  tourist: {
    ko: "해외 관광객",
    en: "Foreign Tourist",
    icon: "◌",
    weights: { traffic: 10, culture: 30, convenience: 25, safety: 18, nature: 17 },
  },
  nomad: {
    ko: "디지털 노마드",
    en: "Digital Nomad",
    icon: "♟",
    weights: { traffic: 18, culture: 22, convenience: 30, safety: 15, nature: 15 },
  },
  senior: {
    ko: "액티브 시니어",
    en: "Active Senior",
    icon: "⌖",
    weights: { traffic: 12, culture: 28, convenience: 25, safety: 15, nature: 20 },
  },
  solo: {
    ko: "나홀로 문화형",
    en: "Solo Travel",
    icon: "○",
    weights: { traffic: 15, culture: 32, convenience: 23, safety: 12, nature: 18 },
  },
};

const REGIONS = [
  {
    id: "gangwon",
    ko: "강원특별자치도",
    en: "Gangwon",
    short: "강원",
    scores: { traffic: 38, culture: 78, convenience: 40, safety: 27, nature: 95 },
    reason: "자연·문화·여가·디지털 지표가 높아 현재 조건에 잘 맞습니다.",
    seniorReason: "자연환경이 좋아 조용히 머물기 좋습니다.",
  },
  {
    id: "gyeonggi",
    ko: "경기도",
    en: "Gyeonggi",
    short: "경기",
    scores: { traffic: 85, culture: 65, convenience: 82, safety: 80, nature: 48 },
    reason: "안전·생활편의 지표가 높아 현재 조건에 잘 맞습니다.",
    seniorReason: "병원과 약국이 가까워 생활하기 편합니다.",
  },
  {
    id: "chungbuk",
    ko: "충청북도",
    en: "Chungbuk",
    short: "충북",
    scores: { traffic: 58, culture: 55, convenience: 61, safety: 78, nature: 86 },
    reason: "자연·안전 지표가 높아 현재 조건에 잘 맞습니다.",
    seniorReason: "안전하고 조용한 체류에 적합합니다.",
  },
  {
    id: "jeonnam",
    ko: "전라남도",
    en: "Jeonnam",
    short: "전남",
    scores: { traffic: 52, culture: 82, convenience: 58, safety: 74, nature: 88 },
    reason: "문화·여가·디지털·교통 지표가 현재 조건에 잘 맞습니다.",
    seniorReason: "여유롭고 자연 친화적인 체류에 좋습니다.",
  },
  {
    id: "gyeongbuk",
    ko: "경상북도",
    en: "Gyeongbuk",
    short: "경북",
    scores: { traffic: 62, culture: 71, convenience: 73, safety: 79, nature: 80 },
    reason: "생활편의·안전 지표가 높아 현재 조건에 잘 맞습니다.",
    seniorReason: "생활 편의와 안전이 균형 잡힌 지역입니다.",
  },
  {
    id: "jeju",
    ko: "제주특별자치도",
    en: "Jeju",
    short: "제주",
    scores: { traffic: 45, culture: 76, convenience: 64, safety: 72, nature: 96 },
    reason: "자연환경과 휴양 체류 지표가 뛰어납니다.",
    seniorReason: "자연을 가까이 느끼며 쉬기 좋은 지역입니다.",
  },
  {
    id: "seoul",
    ko: "서울특별시",
    en: "Seoul",
    short: "서울",
    scores: { traffic: 96, culture: 94, convenience: 93, safety: 69, nature: 35 },
    reason: "교통·문화·생활편의 인프라가 강합니다.",
    seniorReason: "의료와 생활 편의 시설이 많습니다.",
  },
  {
    id: "busan",
    ko: "부산광역시",
    en: "Busan",
    short: "부산",
    scores: { traffic: 82, culture: 86, convenience: 80, safety: 73, nature: 75 },
    reason: "도시 인프라와 해양 관광 자원이 균형 잡혀 있습니다.",
    seniorReason: "도시 편의와 바다 휴식이 함께 있습니다.",
  },
];

const INDICATOR_SECTIONS = [
  {
    key: "traffic",
    title: "교통 (Traffic)",
    icon: "▣",
    variant: "green",
    rows: [
      ["버스정류장 접근성", "개소, 좌표", "전국 버스정류장 위치 데이터", "전국 정류장별 Point", "국토교통부 전국 버스정류장 위치 정보", "대중교통 접근성과 지역 내 이동 편의성을 평가하는 핵심 교통 지표입니다.", "2025"],
      ["철도역 접근성", "개소, 노선 수", "철도역 위치·운행 특성 데이터", "철도역별 Point", "국가철도공단 철도역 정보", "KTX/SRT 접근성과 타 지역 연계 편의성을 판단하는 보조 교통 지표입니다.", "2025"],
    ],
  },
  {
    key: "culture",
    title: "문화 (Culture)",
    icon: "◇",
    variant: "plum",
    rows: [
      ["관광숙박 인프라", "업체수, 객실수", "관광숙박시설 현황 데이터", "시도별·업종별", "문화체육관광부 전국 관광숙박시설 현황", "장기체류 관광객이 머물 수 있는 숙박 선택지의 규모를 보여줍니다.", "2024"],
      ["도시공원 접근성", "개소, ㎡, 좌표", "전국 도시공원 데이터", "공원별 Point", "전국도시공원정보표준데이터", "산책, 휴식, 가족 동반 활동을 지원하는 생활형 여가 인프라 지표입니다.", "2025"],
      ["5G 통신 품질", "Mbps", "17개 시도별 5G 전송속도 데이터", "시도별·통신사별", "과학기술정보통신부", "원격근무와 디지털 체류 편의성을 가늠하는 지표입니다.", "2024"],
      ["공공 와이파이 접근성", "개소, 좌표", "전국 공공 무료 와이파이 정보", "설치지점별 Point", "행정안전부 무료와이파이정보", "공공공간의 디지털 접속성과 체류 편의성을 판단합니다.", "2025"],
    ],
  },
  {
    key: "convenience",
    title: "생활편의 (Convenience)",
    icon: "▥",
    variant: "light",
    rows: [
      ["병원 접근성", "개소, 명, 좌표", "의료기관 기본 목록", "의료기관별 Point", "건강보험심사평가원 병원정보서비스", "체류지 인근 의료기관 밀도와 기본 진료역량을 판단합니다.", "2026"],
      ["약국 접근성", "개소, 좌표", "전국 약국 기본 목록", "약국별 Point", "건강보험심사평가원 약국정보서비스", "상비약 구매와 처방조제 접근성을 보여주는 생활서비스 지표입니다.", "2026"],
      ["의료시설 수용역량", "병상수, 실수", "병상·수술실·응급실 등 시설 현황", "의료기관별", "건강보험심사평가원 시설정보", "응급·입원·수술 대응 가능성을 평가합니다.", "2026"],
      ["행정민원시설 접근성", "개소, 주소", "행정복지센터·주민센터 현황", "시설/주소", "행정안전부 읍면동 하부행정기관현황", "지역 생활정보와 행정민원 처리 편의성을 나타냅니다.", "2025"],
    ],
  },
  {
    key: "safety",
    title: "안전 (Safety)",
    icon: "◉",
    variant: "green",
    rows: [
      ["지역안전지수", "등급 1~5등급", "교통사고, 화재, 범죄 등 6개 분야 안전수준", "시도별·시군구별", "행정안전부 지역안전지수", "지역 선택에서 중요한 안전 체감 수준을 다면적으로 보여줍니다.", "2025"],
    ],
  },
  {
    key: "nature",
    title: "자연 (Nature)",
    icon: "◌",
    variant: "green",
    rows: [
      ["월별 기온 특성", "℃", "평균·최고·최저기온 통계", "관측지점별·월별", "기상청 기상자료개방포털", "기후 쾌적성과 계절별 야외활동 적합성을 판단합니다.", "2025"],
      ["지역당 녹지비율", "%", "녹지면적비율과 행정구역 면적 데이터", "시도별 집계", "환경공간정보서비스", "체감 자연환경 수준과 쾌적성을 보여주는 지표입니다.", "2025"],
      ["미세먼지 PM10 농도", "㎍/㎥", "월평균 PM10 대기질 데이터", "전국·시도·도시별", "KOSIS 미세먼지 통계", "건강부담과 야외활동 적합성을 보여주는 대기환경 지표입니다.", "2024"],
      ["오존 농도", "ppm", "오존 주의보·경보 발령 현황", "시도별·발령권역별", "한국환경공단 에어코리아", "대기환경 부담을 보조적으로 반영하는 지표입니다.", "2025"],
    ],
  },
];


const INDICATOR_EN_SECTIONS = {
  traffic: {
    title: "Transport (Traffic)",
    rows: [
      ["Bus stop accessibility", "Count, coordinates", "Nationwide bus stop location data", "Stop-level Point", "MOLIT bus stop location data", "Core transport indicator for local mobility and public transit accessibility.", "2025"],
      ["Rail station accessibility", "Count, routes", "Rail station location and service data", "Station-level Point", "Korea National Railway station data", "Supplementary indicator for KTX/SRT access and interregional mobility.", "2025"],
    ],
  },
  culture: {
    title: "Culture, Leisure & Digital (Culture)",
    rows: [
      ["Tourism lodging infrastructure", "Businesses, rooms", "Tourism accommodation facility data", "Province / business type", "Ministry of Culture, Sports and Tourism", "Shows the scale of accommodation options for long-stay visitors.", "2024"],
      ["Urban park accessibility", "Count, m², coordinates", "Nationwide urban park data", "Park-level Point", "National urban park standard data", "Local leisure infrastructure for walking, rest, exercise, and family activities.", "2025"],
      ["5G network quality", "Mbps", "Regional 5G download/upload speed data", "Province / telecom provider", "Ministry of Science and ICT", "Digital-stay indicator for remote work and online connectivity.", "2024"],
      ["Public Wi-Fi accessibility", "Count, coordinates", "Nationwide public Wi-Fi data", "Installation-point Point", "MOIS public Wi-Fi data", "Evaluates public digital access and convenience in everyday spaces.", "2025"],
    ],
  },
  convenience: {
    title: "Daily Convenience (Convenience)",
    rows: [
      ["Hospital accessibility", "Count, doctors, coordinates", "Basic medical institution list", "Facility-level Point", "HIRA hospital information service", "Evaluates nearby medical service density and basic treatment capacity.", "2026"],
      ["Pharmacy accessibility", "Count, coordinates", "Nationwide pharmacy list", "Pharmacy-level Point", "HIRA pharmacy information service", "Basic health-service indicator for medicine purchase and prescription access.", "2026"],
      ["Medical capacity", "Beds, rooms", "Beds, operating rooms, emergency rooms and facility details", "Facility-level", "HIRA facility information", "Evaluates capacity for emergency care, hospitalization, and medical response.", "2026"],
      ["Administrative service accessibility", "Count, address", "Community service center data", "Facility/address", "MOIS local administrative office data", "Shows convenience for local administration, residency support, and public services.", "2025"],
    ],
  },
  safety: {
    title: "Safety (Safety)",
    rows: [
      ["Regional safety index", "Grade 1–5", "Safety levels across traffic accidents, fire, crime, daily safety and more", "Province / city-county-district", "MOIS regional safety index", "Comprehensive indicator for perceived local safety.", "2025"],
    ],
  },
  nature: {
    title: "Nature & Environment (Nature)",
    rows: [
      ["Monthly temperature characteristics", "°C", "Average, maximum and minimum temperature statistics", "Station/month", "KMA open weather data portal", "Evaluates climate comfort and seasonal outdoor activity suitability.", "2025"],
      ["Green-area ratio", "%", "Green area and administrative-area data", "Province-level aggregation", "Environmental Spatial Information Service", "Shows perceived natural environment and local comfort.", "2025"],
      ["PM10 fine dust concentration", "㎍/㎥", "Monthly average PM10 air-quality data", "Nation/province/city", "KOSIS PM10 statistics", "Air-quality indicator for health burden and outdoor activity suitability.", "2024"],
      ["Ozone concentration", "ppm", "Ozone warning/advisory occurrence data", "Province/zone/date", "AirKorea, Korea Environment Corporation", "Supplementary air-quality indicator reflected negatively when concentration is high.", "2025"],
    ],
  },
};

const INDICATOR_COLUMNS = {
  ko: ["지표명", "단위", "지표내용", "데이터레벨", "자료출처", "지표 설명글", "자료 시점"],
  en: ["Indicator", "Unit", "Description", "Data level", "Source", "Interpretation", "Data year"],
};

const USER_GUIDE_KO = [
  {
    title: "1. 데이터 기준 안내",
    items: [
      "머묾의 지역별 지표는 공공데이터와 가공 데이터를 기반으로 산출됩니다.",
      "각 지표는 자료출처와 기준 시점이 서로 다르므로, 실제 현황과 일부 차이가 있을 수 있습니다.",
      "추천 결과는 지역 선택을 돕기 위한 참고 정보로 활용해 주세요.",
    ],
  },
  {
    title: "2. 점수 해석 안내",
    items: [
      "점수가 높을수록 해당 카테고리에서 장기체류에 유리한 조건을 갖춘 지역으로 해석합니다.",
      "다만 미세먼지, 오존, 지역안전지수 등 일부 지표는 원천값이 낮을수록 긍정적인 의미를 가지므로, 서비스에서는 추천 점수에 맞게 방향을 보정해 반영합니다.",
    ],
  },
  {
    title: "3. 자료출처 안내",
    items: ["각 지표의 원천 파일, 자료출처, 데이터레벨, 자료 시점은 지표설명 화면에서 확인할 수 있습니다."],
  },
];

const USER_GUIDE_EN = [
  {
    title: "1. Data standard notice",
    items: [
      "Regional indicators are calculated from public datasets and processed analytical data.",
      "Each indicator may have a different source and reference date, so results may differ from real-time conditions.",
      "Use recommendation results as reference information to support regional choice.",
    ],
  },
  {
    title: "2. Score interpretation notice",
    items: [
      "A higher score means the region has more favorable conditions for long-stay travel in that category.",
      "For some indicators such as fine dust, ozone, and safety index, lower raw values can be positive; the service adjusts direction so the recommendation score remains intuitive.",
    ],
  },
  {
    title: "3. Source notice",
    items: ["Raw files, data sources, data levels, and reference dates can be checked in the indicator guide."],
  },
];

function calcFinalScore(scores, weights) {
  const total = Object.values(weights).reduce((sum, value) => sum + Number(value), 0);
  if (total === 0) return 0;
  return Object.entries(weights).reduce((sum, [key, weight]) => sum + scores[key] * (weight / total), 0);
}

function clampScore(score) {
  return Math.max(0, Math.min(100, Math.round(score)));
}


const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const PRESET_ID_MAP = {
  standard: "default",
  tourist: "foreign_tourist",
  nomad: "remote_worker",
  senior: "active_senior",
  solo: "culture_single_couple",
};

const REGION_LOGO_MAP = [
  [/서울|Seoul/i, "/assets/region_logo/Seoul.svg"],
  [/부산|Busan/i, "/assets/region_logo/Busan.svg"],
  [/대구|Daegu/i, "/assets/region_logo/Daegu.svg"],
  [/인천|Incheon/i, "/assets/region_logo/Incheon.svg"],
  [/광주|Gwangju/i, "/assets/region_logo/Gwangju.png"],
  [/대전|Daejeon/i, "/assets/region_logo/Daejeon.png"],
  [/울산|Ulsan/i, "/assets/region_logo/Ulsan.png"],
  [/세종|Sejong/i, "/assets/region_logo/Sejong.png"],
  [/경기|Gyeonggi/i, "/assets/region_logo/Gyeonggi.svg"],
  [/강원|Gangwon/i, "/assets/region_logo/Gangwon.png"],
  [/충청북|충북|Chungcheongbuk|Chungbuk/i, "/assets/region_logo/Chungcheongbuk.svg"],
  [/충청남|충남|Chungcheongnam|Chungnam/i, "/assets/region_logo/Chungcheongnam.svg"],
  [/전라북|전북|Jeonbuk|Jeollabuk/i, "/assets/region_logo/Jeonbuk.svg"],
  [/전라남|전남|Jeollanam|Jeonnam/i, "/assets/region_logo/Jeollanam.svg"],
  [/경상북|경북|Gyeongsangbuk|Gyeongbuk/i, "/assets/region_logo/Gyeongsangbuk.svg"],
  [/경상남|경남|Gyeongsangnam|Gyeongnam/i, "/assets/region_logo/Gyeongsangnam.svg"],
  [/제주|Jeju/i, "/assets/region_logo/Jeju.png"],
];


const SIDO_NAMES_KO = [
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", "대전광역시", "울산광역시",
  "세종특별자치시", "경기도", "강원특별자치도", "충청북도", "충청남도", "전북특별자치도", "전라북도",
  "전라남도", "경상북도", "경상남도", "제주특별자치도",
];

const SIDO_ALIAS_TO_FULL_KO = {
  서울: "서울특별시",
  부산: "부산광역시",
  대구: "대구광역시",
  인천: "인천광역시",
  광주: "광주광역시",
  대전: "대전광역시",
  울산: "울산광역시",
  세종: "세종특별자치시",
  경기: "경기도",
  강원: "강원특별자치도",
  충북: "충청북도",
  충남: "충청남도",
  전북: "전북특별자치도",
  전남: "전라남도",
  경북: "경상북도",
  경남: "경상남도",
  제주: "제주특별자치도",
};

const SIGUNGU_GROUPS_BY_SIDO_KO = {
  서울특별시: ["종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구", "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구", "양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구", "서초구", "강남구", "송파구", "강동구"],
  부산광역시: ["중구", "서구", "동구", "영도구", "부산진구", "동래구", "남구", "북구", "해운대구", "사하구", "금정구", "강서구", "연제구", "수영구", "사상구", "기장군"],
  대구광역시: ["중구", "동구", "서구", "남구", "북구", "수성구", "달서구", "달성군", "군위군"],
  인천광역시: ["중구", "동구", "미추홀구", "연수구", "남동구", "부평구", "계양구", "서구", "강화군", "옹진군"],
  광주광역시: ["동구", "서구", "남구", "북구", "광산구"],
  대전광역시: ["동구", "중구", "서구", "유성구", "대덕구"],
  울산광역시: ["중구", "남구", "동구", "북구", "울주군"],
  세종특별자치시: ["세종시", "세종특별자치시"],
  경기도: ["수원시", "성남시", "의정부시", "안양시", "부천시", "광명시", "평택시", "동두천시", "안산시", "고양시", "과천시", "구리시", "남양주시", "오산시", "시흥시", "군포시", "의왕시", "하남시", "용인시", "파주시", "이천시", "안성시", "김포시", "화성시", "광주시", "양주시", "포천시", "여주시", "연천군", "가평군", "양평군"],
  강원특별자치도: ["춘천시", "원주시", "강릉시", "동해시", "태백시", "속초시", "삼척시", "홍천군", "횡성군", "영월군", "평창군", "정선군", "철원군", "화천군", "양구군", "인제군", "고성군", "양양군"],
  충청북도: ["청주시", "충주시", "제천시", "보은군", "옥천군", "영동군", "증평군", "진천군", "괴산군", "음성군", "단양군"],
  충청남도: ["천안시", "공주시", "보령시", "아산시", "서산시", "논산시", "계룡시", "당진시", "금산군", "부여군", "서천군", "청양군", "홍성군", "예산군", "태안군"],
  전북특별자치도: ["전주시", "군산시", "익산시", "정읍시", "남원시", "김제시", "완주군", "진안군", "무주군", "장수군", "임실군", "순창군", "고창군", "부안군"],
  전라남도: ["목포시", "여수시", "순천시", "나주시", "광양시", "담양군", "곡성군", "구례군", "고흥군", "보성군", "화순군", "장흥군", "강진군", "해남군", "영암군", "무안군", "함평군", "영광군", "장성군", "완도군", "진도군", "신안군"],
  경상북도: ["포항시", "경주시", "김천시", "안동시", "구미시", "영주시", "영천시", "상주시", "문경시", "경산시", "의성군", "청송군", "영양군", "영덕군", "청도군", "고령군", "성주군", "칠곡군", "예천군", "봉화군", "울진군", "울릉군"],
  경상남도: ["창원시", "진주시", "통영시", "사천시", "김해시", "밀양시", "거제시", "양산시", "의령군", "함안군", "창녕군", "고성군", "남해군", "하동군", "산청군", "함양군", "거창군", "합천군"],
  제주특별자치도: ["제주시", "서귀포시"],
};

const SIGUNGU_TO_SIDO_KO = (() => {
  const candidates = {};
  Object.entries(SIGUNGU_GROUPS_BY_SIDO_KO).forEach(([sido, names]) => {
    names.forEach((name) => {
      candidates[name] = candidates[name] || new Set();
      candidates[name].add(sido);
    });
  });

  return Object.fromEntries(
    Object.entries(candidates)
      .filter(([, sidos]) => sidos.size === 1)
      .map(([name, sidos]) => [name, [...sidos][0]])
  );
})();

const SIDO_ID_HINTS_KO = [
  ["서울특별시", /seoul|서울/iu],
  ["부산광역시", /busan|부산/iu],
  ["대구광역시", /daegu|대구/iu],
  ["인천광역시", /incheon|인천/iu],
  ["광주광역시", /gwangju|광주/iu],
  ["대전광역시", /daejeon|대전/iu],
  ["울산광역시", /ulsan|울산/iu],
  ["세종특별자치시", /sejong|세종/iu],
  ["경기도", /gyeonggi|경기/iu],
  ["강원특별자치도", /gangwon|강원/iu],
  ["충청북도", /chungcheongbuk|chungbuk|충북|충청북/iu],
  ["충청남도", /chungcheongnam|chungnam|충남|충청남/iu],
  ["전북특별자치도", /jeonbuk|jeollabuk|전북|전라북/iu],
  ["전라남도", /jeonnam|jeollanam|전남|전라남/iu],
  ["경상북도", /gyeongbuk|gyeongsangbuk|경북|경상북/iu],
  ["경상남도", /gyeongnam|gyeongsangnam|경남|경상남/iu],
  ["제주특별자치도", /jeju|제주/iu],
];

function normalizeSidoNameKo(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (SIDO_NAMES_KO.includes(text)) return text === "전라북도" ? "전북특별자치도" : text;
  if (SIDO_ALIAS_TO_FULL_KO[text]) return SIDO_ALIAS_TO_FULL_KO[text];
  const contained = SIDO_NAMES_KO.find((name) => text.includes(name));
  if (contained) return contained === "전라북도" ? "전북특별자치도" : contained;
  const alias = Object.entries(SIDO_ALIAS_TO_FULL_KO).find(([shortName]) => text.includes(shortName));
  return alias ? alias[1] : "";
}

function inferParentRegionNameKo(regionName, source = {}) {
  const directParent = [
    source.parentRegionNameKo,
    source.parent_region_name_ko,
    source.parentNameKo,
    source.parent_name_ko,
    source.parent_ko,
    source.sidoNameKo,
    source.sido_name_ko,
    source.sido_name,
    source.sido,
    source.provinceNameKo,
    source.province_name_ko,
    source.province_ko,
    source.province,
    source.adm1NameKo,
    source.adm1_name_ko,
    source.doNameKo,
    source.do_name_ko,
  ].map(normalizeSidoNameKo).find(Boolean);

  if (directParent) return directParent;

  const name = String(regionName || "").trim();
  if (!name || SIDO_NAMES_KO.includes(name)) return "";

  const parentInName = normalizeSidoNameKo(name);
  if (parentInName && name !== parentInName) return parentInName;

  const idText = [
    source.id,
    source.region_id,
    source.regionId,
    source.regionCode,
    source.region_code,
    source.fullNameKo,
    source.full_name_ko,
    source.regionFullNameKo,
    source.region_full_name_ko,
    source.address,
  ].filter(Boolean).join(" ");

  const parentFromId = SIDO_ID_HINTS_KO.find(([, pattern]) => pattern.test(idText));
  if (parentFromId) return parentFromId[0];

  const lastToken = name.split(/\s+/).pop();
  return SIGUNGU_TO_SIDO_KO[name] || SIGUNGU_TO_SIDO_KO[lastToken] || "";
}

function normalizedWeightsForApi(weights) {
  const total = Object.values(weights).reduce((sum, value) => sum + Number(value || 0), 0);
  if (!total) return { traffic: 0.15, culture: 0.25, convenience: 0.28, safety: 0.17, nature: 0.15 };
  return Object.fromEntries(Object.entries(weights).map(([key, value]) => [key, Number((Number(value || 0) / total).toFixed(6))]));
}

function regionLogoFor(region) {
  const target = [region?.ko, region?.en, region?.parentRegionNameKo, region?.parentRegionNameEn].filter(Boolean).join(" ");
  const found = REGION_LOGO_MAP.find(([pattern]) => pattern.test(target));
  return found?.[1] || "";
}

function getRegionDisplayName(region, isEnglish = false) {
  const regionName = String(
    (isEnglish ? region?.en : region?.ko) ||
    (isEnglish ? region?.regionNameEn : region?.regionNameKo) ||
    region?.short ||
    ""
  ).trim();

  const parentName = String(
    (isEnglish ? region?.parentRegionNameEn : region?.parentRegionNameKo) ||
    (isEnglish ? region?.parent_region_name_en : region?.parent_region_name_ko) ||
    (!isEnglish ? inferParentRegionNameKo(regionName, region) : "") ||
    ""
  ).trim();

  if (!parentName) return regionName;
  if (!regionName) return parentName;
  if (SIDO_NAMES_KO.includes(regionName)) return regionName;
  if (regionName.includes(parentName)) return regionName;

  return `${parentName} ${regionName}`.trim();
}

function getRegionOnlySearchName(region, isEnglish = false) {
  const parentName =
    (isEnglish ? region?.parentRegionNameEn : region?.parentRegionNameKo) ||
    region?.parent_region_name_ko ||
    region?.sido_name_ko ||
    "";

  const regionName =
    (isEnglish ? region?.en : region?.ko) ||
    region?.regionNameKo ||
    region?.region_name_ko ||
    region?.short ||
    "";

  const hasParentInRegion = parentName && regionName.includes(parentName);

  return [hasParentInRegion ? "" : parentName, regionName]
    .filter(Boolean)
    .join(" ")
    .trim()
    .replace(/\s*(관광지|여행지|명소|가볼만한곳|맛집)\s*$/g, "")
    .trim();
}

function normalizeApiRegion(item, weights) {
  const scores = item.categoryScores || item.category_scores || item.scores || {};
  const ko = item.regionNameKo || item.region_name_ko || item.regionName || item.name_ko || item.ko || "지역";
  const en = item.regionNameEn || item.region_name_en || item.name_en || item.en || ko;
  const parentKo = inferParentRegionNameKo(ko, item);
  const parentEn = item.parentRegionNameEn || item.parent_region_name_en || item.parentNameEn || item.parent_name_en || item.parent_en || item.sidoNameEn || item.sido_name_en || item.provinceNameEn || item.province_name_en || item.province_en || "";
  const reasons = item.reasons || item.reason || [];
  const reasonText = Array.isArray(reasons) ? reasons[0] : reasons;
  const final = item.finalScore ?? item.final_score ?? calcFinalScore(scores, weights);
  const region = {
    id: item.region_id || item.regionId || item.id,
    ko,
    en,
    short: item.shortName || item.short_name || ko.replace(/특별자치도|특별자치시|특별시|광역시|시|군|구/g, "").slice(0, 6),
    parentRegionNameKo: parentKo,
    parentRegionNameEn: parentEn,
    scores: {
      traffic: Number(scores.traffic ?? 0),
      culture: Number(scores.culture ?? 0),
      convenience: Number(scores.convenience ?? 0),
      safety: Number(scores.safety ?? 0),
      nature: Number(scores.nature ?? 0),
    },
    finalScore: clampScore(final),
    reason: reasonText || "가중치와 지역 지표를 기반으로 추천된 지역입니다.",
    seniorReason: reasonText || "생활 편의와 체류 적합도를 고려한 추천 지역입니다.",
    naverMap: item.naverMap || item.naver_map || {},
    touristSpots: item.touristSpots || item.tourist_spots || [],
    raw: item.raw || [],
    categories: item.categories || null,
  };
  region.logoUrl = regionLogoFor(region);
  return region;
}

async function apiJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `API ${response.status}`);
  }
  return response.json();
}

function getRegionId(region) {
  return region?.id || region?.region_id || region?.regionId;
}

function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map((item) => safeText(item)).filter(Boolean).join(", ");
  if (typeof value === "object") {
    return value.text || value.content || value.summary || value.title || value.description || fallback;
  }
  return fallback;
}

function normalizeRagWeights(weights) {
  return {
    traffic: Number(weights?.traffic ?? 0),
    culture: Number(weights?.culture ?? 0),
    convenience: Number(weights?.convenience ?? 0),
    safety: Number(weights?.safety ?? 0),
    nature: Number(weights?.nature ?? 0),
  };
}

function RagInsightPanel({ region, weights, presetId, isEnglish }) {
  const [ragData, setRagData] = useState(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState("");

  useEffect(() => {
    const regionId = getRegionId(region);
    if (!regionId) {
      setRagError(isEnglish ? "Region ID is missing." : "지역 ID가 없어 AI 추천 근거를 불러올 수 없습니다.");
      return;
    }

    let ignore = false;

    async function fetchRagInsight() {
      try {
        setRagLoading(true);
        setRagError("");

        const json = await apiJson("/ai/explain-region", {
          method: "POST",
          body: JSON.stringify({
            region_id: regionId,
            preset_id: presetId || "default",
            weights: normalizeRagWeights(weights),
            language: isEnglish ? "en" : "ko",
          }),
        });

        if (!ignore) setRagData(json.data || json);
      } catch (error) {
        console.error("RAG insight API error:", error);
        if (!ignore) {
          setRagError(
            isEnglish
              ? "Failed to load AI insight. Please try again."
              : "AI 추천 근거를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
          );
        }
      } finally {
        if (!ignore) setRagLoading(false);
      }
    }

    fetchRagInsight();
    return () => {
      ignore = true;
    };
  }, [region, weights, presetId, isEnglish]);

  const generated =
    ragData?.explanation ||
    ragData?.generated ||
    ragData?.result ||
    ragData?.ai_result ||
    ragData;

  const displayName = getRegionDisplayName(region, isEnglish);
  const title =
    safeText(generated?.title) ||
    (isEnglish ? `Why ${displayName || "this region"} was recommended` : `${displayName || "선택 지역"} 추천 이유`);

  const presetPerspective = safeText(
    generated?.preset_perspective || generated?.presetPerspective || generated?.perspective
  );
  const scoreContribution = safeText(
    generated?.score_contribution || generated?.scoreContribution || generated?.contribution
  );
  const integratedSummary = safeText(
    generated?.integrated_summary || generated?.integratedSummary || generated?.final_summary || generated?.summary
  );
  const notice = safeText(generated?.notice);
  const isFallback = Boolean(ragData?.is_fallback || ragData?.isFallback);

  return (
    <section className="rag-insight-panel">
      <div className="rag-insight-header">
        <div className="rag-title-row">
          <span className="rag-badge">{isFallback ? "Fallback" : "GPT"}</span>
          <span className="rag-sub-badge">{isEnglish ? "AI Generated Insight" : "AI 추천 근거"}</span>
        </div>
        <h3>{title}</h3>
        <p>
          {isEnglish
            ? "This explanation is generated from selected region data, preset, weights, detailed indicators, and public-data sources."
            : "이 설명은 선택 지역의 점수, 선택 프리셋, 사용자 가중치, 상세 지표, 데이터 출처를 기반으로 생성되었습니다."}
        </p>
      </div>

      {ragLoading && (
        <div className="rag-loading">
          {isEnglish ? "Generating AI insight..." : "AI가 추천 근거를 생성하는 중입니다..."}
        </div>
      )}

      {ragError && !ragLoading && <div className="rag-error">{ragError}</div>}

      {!ragLoading && !ragError && ragData && (
        <div className="rag-column-grid">
          <article className="rag-card rag-wide-card">
            <h4>{isEnglish ? "Preset perspective" : "프리셋 선택 관점 해석"}</h4>
            <p>
              {presetPerspective ||
                (isEnglish
                  ? "From the selected preset perspective, this region shows suitability based on the current weights and available indicator data."
                  : "선택한 프리셋 관점에서 이 지역은 현재 가중치와 지표 데이터 기준으로 장기체류 후보지로 적합하게 나타났습니다.")}
            </p>
          </article>

          <article className="rag-card rag-wide-card">
            <h4>{isEnglish ? "Score contribution" : "점수 기여도 설명"}</h4>
            <p>
              {scoreContribution ||
                (isEnglish
                  ? "The final score reflects the selected category weights and the region's relative category scores."
                  : "최종 점수에는 사용자가 설정한 카테고리 가중치와 지역별 상대점수가 함께 반영되었습니다.")}
            </p>
          </article>

          <article className="rag-card rag-wide-card">
            <h4>{isEnglish ? "Integrated summary" : "통합 의견"}</h4>
            <p>
              {integratedSummary ||
                (isEnglish
                  ? "This region can be considered a suitable candidate under the current recommendation conditions, while relatively weaker indicators should be reviewed before making a final decision."
                  : "이 지역은 현재 추천 조건에서 장기체류 후보지로 검토할 만하며, 상대적으로 낮은 지표는 실제 선택 전에 함께 확인하는 것이 좋습니다.")}
            </p>
          </article>

          <article className="rag-card rag-wide-card rag-notice-card">
            <h4>{isEnglish ? "Note" : "참고할 점"}</h4>
            <p>
              {notice ||
                (isEnglish
                  ? "This is a relative recommendation based on available public data, not an absolute evaluation of the region."
                  : "이 결과는 사용 가능한 공공데이터 기반 상대 추천이며, 해당 지역에 대한 절대 평가가 아닙니다.")}
            </p>
          </article>
        </div>
      )}
    </section>
  );
}


function App() {
  const [view, setView] = useState("dashboard");
  const [mode, setMode] = useState("simple");
  const [language, setLanguage] = useState("ko");
  const [helpTab, setHelpTab] = useState("service");
  const [selectedPreset, setSelectedPreset] = useState("standard");
  const [weights, setWeights] = useState(PRESETS.standard.weights);
  const [hasCustomWeights, setHasCustomWeights] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState("gangwon");
  const [detailRegion, setDetailRegion] = useState(null);
  const [toast, setToast] = useState("");
  const [mapZoom, setMapZoom] = useState(1);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [mapDrag, setMapDrag] = useState(null);
  const [remoteRankings, setRemoteRankings] = useState([]);
  const [apiStatus, setApiStatus] = useState({ loading: false, error: "" });
  const [tooltipContent, setTooltipContent] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextMode = params.get("mode");
    const nextLang = params.get("lang");
    const nextRegion = params.get("region");
    if (["simple", "detail", "senior"].includes(nextMode)) setMode(nextMode);
    if (["ko", "en"].includes(nextLang)) setLanguage(nextLang);
    if (nextRegion) setSelectedRegionId(nextRegion);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setApiStatus({ loading: true, error: "" });
      try {
        const data = await apiJson("/recommendations", {
          method: "POST",
          body: JSON.stringify({
            preset_id: PRESET_ID_MAP[selectedPreset] || selectedPreset,
            weights: normalizedWeightsForApi(weights),
            limit: 5,
            region_level: "sigungu",
            language,
          }),
        });
        const list = (data.recommendations || []).map((item) => normalizeApiRegion(item, weights));
        if (list.length) {
          setRemoteRankings(list);
          setSelectedRegionId((current) => list.some((region) => region.id === current) ? current : list[0].id);
        }
        setApiStatus({ loading: false, error: "" });
      } catch (error) {
        console.warn("MEOMUM API fallback:", error);
        setRemoteRankings([]);
        setApiStatus({ loading: false, error: error.message || "API 연결 실패" });
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [weights, selectedPreset, language]);

  const rankings = useMemo(() => {
    if (remoteRankings.length) return remoteRankings;
    return REGIONS.map((region) => ({
      ...region,
      logoUrl: regionLogoFor(region),
      finalScore: calcFinalScore(region.scores, weights),
    })).sort((a, b) => b.finalScore - a.finalScore).slice(0, 5);
  }, [weights, remoteRankings]);

  const selectedRegion = rankings.find((region) => region.id === selectedRegionId) || rankings[0];
  const isEnglish = language === "en";
  const isSenior = mode === "senior";
  const isDetail = mode === "detail";

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function applyPreset(key) {
    setSelectedPreset(key);
    setWeights(PRESETS[key].weights);
    setHasCustomWeights(false);
  }

  function resetWeights() {
    applyPreset("standard");
  }

  function handleModeChange(nextMode) {
    setMode(nextMode);
  }

  function updateWeight(key, value) {
    const numericValue = Number(value);
    const safeValue = Number.isFinite(numericValue)
      ? Math.max(0, Math.min(100, numericValue))
      : 0;

    setHasCustomWeights(true);
    setWeights((prev) => ({
      ...prev,
      [key]: safeValue,
    }));
  }

  async function openDetail(region) {
    setDetailRegion(region);
    if (!region?.id) return;
    try {
      const detail = await apiJson(`/scores/${encodeURIComponent(region.id)}`);
      setDetailRegion({ ...region, ...normalizeApiRegion({ ...detail, finalScore: region.finalScore }, weights) });
    } catch (error) {
      console.warn("Detail API fallback:", error);
    }
  }

  function openNaverMap(region, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const regionName = getRegionOnlySearchName(region, isEnglish);
    if (!regionName) return;

    const url = `https://map.naver.com/p/search/${encodeURIComponent(regionName)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function shareCurrent() {
    const url = `${window.location.origin}?mode=${mode}&lang=${language}&region=${selectedRegion.id}`;
    await navigator.clipboard?.writeText(url);
    showToast(isEnglish ? "Share link copied." : "공유 링크가 복사되었습니다.");
  }


  function changeMapZoom(delta) {
    setMapZoom((zoom) => {
      const nextZoom = Math.max(1, Math.min(2.2, Number((zoom + delta).toFixed(2))));
      if (nextZoom === 1) setMapOffset({ x: 0, y: 0 });
      return nextZoom;
    });
  }

  function startMapDrag(event) {
    if (event.button !== 2) return;
    event.preventDefault();
    setMapDrag({
      startX: event.clientX,
      startY: event.clientY,
      originX: mapOffset.x,
      originY: mapOffset.y,
    });
  }

  function moveMapDrag(event) {
    if (!mapDrag) return;
    event.preventDefault();
    setMapOffset({
      x: mapDrag.originX + event.clientX - mapDrag.startX,
      y: mapDrag.originY + event.clientY - mapDrag.startY,
    });
  }

  function stopMapDrag() {
    setMapDrag(null);
  }

  if (view === "help") {
    return (
      <>
        <HelpCenter
          helpTab={helpTab}
          setHelpTab={setHelpTab}
          language={language}
          setLanguage={setLanguage}
          onStart={() => setView("dashboard")}
        />
        {toast && <div className="toast">{toast}</div>}
      </>
    );
  }

  return (
    <main className={`app ${isSenior ? "senior-mode" : ""}`}>
      <header className="top-header">
        <button className="logo-button" onClick={() => window.location.reload()} aria-label="MEOMUM 새로고침">
          <img src={logoImage} alt="MEOMUM" className="logo-image" />
        </button>
        <nav className="top-nav">
          {["simple", "detail", "senior"].map((modeKey) => {
            const item = MODES.find((modeItem) => modeItem.key === modeKey);
            return (
              <button
                key={item.key}
                className={mode === item.key ? "active" : ""}
                onClick={() => handleModeChange(item.key)}
              >
                {isEnglish ? item.en : item.ko}
              </button>
            );
          })}
          <div className="nav-divider" />
          <button
            className={language === "ko" ? "active" : ""}
            onClick={() => setLanguage("ko")}
          >
            한국어
          </button>
          <button
            className={language === "en" ? "active" : ""}
            onClick={() => setLanguage("en")}
          >
            🌐 English
          </button>
          <button className={view === "help" ? "active" : ""} onClick={() => { setView("help"); setHelpTab("service"); }}>ⓘ {isEnglish ? "Help" : "도움말"}</button>
        </nav>
      </header>

      <section className="dashboard-layout">
        <aside className="left-panel">
          {isDetail ? (
            <>
          <section className="soft-card weight-card">
            <div className="card-title">◷ {isEnglish ? "5 Category Weights" : "5대 카테고리 가중치"}</div>
            <div className="slider-list">
              {CATEGORIES.map((category) => (
                <div className="slider-row" key={category.key}>
                  <div className="slider-head">
                    <span><i>{category.icon}</i>{isEnglish ? category.en : category.ko}</span>
                    <label className="weight-number-wrap" aria-label={`${isEnglish ? category.en : category.ko} weight value`}>
                      <input
                        className="weight-number-input"
                        type="number"
                        min="0"
                        max="100"
                        value={weights[category.key]}
                        onChange={(event) => updateWeight(category.key, event.target.value)}
                        onBlur={(event) => updateWeight(category.key, event.target.value)}
                      />
                    </label>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weights[category.key]}
                    onChange={(event) => updateWeight(category.key, event.target.value)}
                  />
                  <div className="slider-scale"><span>Low</span><span>High</span></div>
                </div>
              ))}
            </div>
            <div className="weight-actions">
              <span>{isEnglish ? "Applied to all calculations" : "전체와 계산 적용"}</span>
              <button onClick={resetWeights}>↻ Reset</button>
            </div>
          </section>
          <section className="soft-card preset-card">
            <div className="card-title">⚡ {isEnglish ? "Customize" : "맞춤 설정"}</div>
            <div className="preset-list">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  className={`preset-item ${selectedPreset === key ? "selected" : ""}`}
                  onClick={() => applyPreset(key)}
                >
                  <span className="preset-emoji">{preset.icon}</span>
                  <div>
                    <strong>{isEnglish ? preset.en : preset.ko}</strong>
                    <small>{preset.en}</small>
                  </div>
                </button>
              ))}
            </div>
          </section>
            </>
          ) : (
            <>
          <section className="soft-card preset-card">
            <div className="card-title">⚡ {isEnglish ? "Customize" : "맞춤 설정"}</div>
            <div className="preset-list">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  className={`preset-item ${selectedPreset === key ? "selected" : ""}`}
                  onClick={() => applyPreset(key)}
                >
                  <span className="preset-emoji">{preset.icon}</span>
                  <div>
                    <strong>{isEnglish ? preset.en : preset.ko}</strong>
                    <small>{preset.en}</small>
                  </div>
                </button>
              ))}
            </div>
          </section>
          <section className="soft-card weight-card">
            <div className="card-title">◷ {isEnglish ? "5 Category Weights" : "5대 카테고리 가중치"}</div>
            <div className="slider-list">
              {CATEGORIES.map((category) => (
                <div className="slider-row" key={category.key}>
                  <div className="slider-head">
                    <span><i>{category.icon}</i>{isEnglish ? category.en : category.ko}</span>
                    <label className="weight-number-wrap" aria-label={`${isEnglish ? category.en : category.ko} weight value`}>
                      <input
                        className="weight-number-input"
                        type="number"
                        min="0"
                        max="100"
                        value={weights[category.key]}
                        onChange={(event) => updateWeight(category.key, event.target.value)}
                        onBlur={(event) => updateWeight(category.key, event.target.value)}
                      />
                    </label>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weights[category.key]}
                    onChange={(event) => updateWeight(category.key, event.target.value)}
                  />
                  <div className="slider-scale"><span>Low</span><span>High</span></div>
                </div>
              ))}
            </div>
            <div className="weight-actions">
              <span>{isEnglish ? "Applied to all calculations" : "전체와 계산 적용"}</span>
              <button onClick={resetWeights}>↻ Reset</button>
            </div>
          </section>
            </>
          )}
        </aside>

        <section className="map-card" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="map-badge" style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10 }}>
            🗺️ {isEnglish ? "Weighted Recommendation Map" : "가중치 기반 반응형 지도"}
            {apiStatus.loading ? (isEnglish ? " · Loading" : " · 계산 중") : ""}
          </div>

          <div className="zoom-controls" style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10 }}>
            <button aria-label="지도 확대" onClick={() => changeMapZoom(0.5)}>＋</button>
            <button aria-label="지도 축소" onClick={() => changeMapZoom(-0.5)}>－</button>
          </div>

          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 4500 }}
            style={{ width: "100%", height: "100%", minHeight: "500px", outline: "none", cursor: "grab" }}
          >
            <ZoomableGroup
              center={[127.5, 36]}
              zoom={mapZoom}
              onMoveEnd={(position) => setMapZoom(position.zoom)}
              maxZoom={10}
            >
              <Geographies geography="https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_municipalities_geo_simple.json">
                {({ geographies }) => {
                  if (!geographies) return null;

                  return (
                    <>
                      {/* 🗺️ 1. 땅(지역) 싹 그리기 */}
                      {geographies.map((geo) => {
                        const mapName = (geo?.properties?.name || "").replace(/\s+/g, ''); // 예: "부천시원미구", "종로구"

                        const rankIndex = rankings.findIndex(r => {
                          const rKo = (r.ko || "").replace(/\s+/g, ''); // 예: "경기도부천시"
                          const rShort = (r.short || "").replace(/\s+/g, '');

                          // 🚨 핵심 로직: "경기도 부천시"에서 마지막 단어인 "부천시"만 추출!
                          const parts = (r.ko || "").trim().split(/\s+/);
                          const coreName = parts[parts.length - 1]; // "부천시", "종로구" 등

                          return mapName === rKo || mapName === rShort ||
                            mapName.includes(coreName) || // "부천시원미구"가 "부천시"를 포함하면 합격!
                            rKo.includes(mapName);        // "서울특별시종로구"가 "종로구"를 포함하면 합격!
                        });

                        const isTop5 = rankIndex !== -1 && rankIndex < 5;
                        const rankColors = ["#2d4a22", "#4b7a3a", "#6ab354", "#97b986", "#c3d6b8"];
                        const fillColor = isTop5 ? rankColors[rankIndex] : "#e2e8f0";
                        const strokeColor = isTop5 ? fillColor : "#ffffff"; // 구 경계선 숨기기

                        return (
                          <Geography
                            key={geo.rsmKey || geo.properties.code}
                            geography={geo}
                            fill={fillColor}
                            stroke={strokeColor}
                            strokeWidth={0.5 / mapZoom}
                            style={{
                              default: { outline: "none", transition: "fill 0.3s ease" },
                              hover: { fill: "#db9ebb", cursor: "pointer", outline: "none" },
                              pressed: { outline: "none" }
                            }}
                            onMouseEnter={() => setTooltipContent(isTop5 ? `${getRegionDisplayName(rankings[rankIndex], false)}: 🏆 ${rankIndex + 1}위` : (geo?.properties?.name || ""))}
                            onMouseLeave={() => setTooltipContent("")}
                            onClick={() => { if (isTop5) setSelectedRegionId(rankings[rankIndex].id); }}
                            data-tooltip-id="map-tooltip"
                            data-tooltip-content={tooltipContent}
                          />
                        );
                      })}

                      {/* 📍 2. Top 5 마커 꽂기 */}
                      {rankings.slice(0, 5).map((rankedRegion, rankIndex) => {
                        const rKo = (rankedRegion.ko || "").replace(/\s+/g, '');
                        const rShort = (rankedRegion.short || "").replace(/\s+/g, '');
                        const parts = (rankedRegion.ko || "").trim().split(/\s+/);
                        const coreName = parts[parts.length - 1];

                        const matchingGeos = geographies.filter(geo => {
                          const mapName = (geo?.properties?.name || "").replace(/\s+/g, '');
                          return mapName === rKo || mapName === rShort ||
                            mapName.includes(coreName) ||
                            rKo.includes(mapName);
                        });

                        if (matchingGeos.length === 0) return null;

                        // 여러 개의 '구'가 합쳐져 있어도 마커는 무조건 1개만 꽂습니다.
                        const centroid = geoCentroid(matchingGeos[0]);
                        const isFirst = rankIndex === 0;

                        return (
                          <Marker
                            key={`marker-rank-${rankedRegion.id}`}
                            coordinates={centroid}
                            onMouseEnter={() => setTooltipContent(`${getRegionDisplayName(rankedRegion, false)}: 🏆 ${rankIndex + 1}위`)}
                            onMouseLeave={() => setTooltipContent("")}
                            onClick={() => setSelectedRegionId(rankedRegion.id)}
                            data-tooltip-id="map-tooltip"
                            data-tooltip-content={tooltipContent}
                            style={{ cursor: "pointer" }}
                          >
                            <g
                              transform="translate(-12, -24)"
                              style={{ transition: "all 0.2s ease-in-out" }}
                              onMouseEnter={(e) => e.currentTarget.style.transform = "translate(-12px, -30px) scale(1.15)"}
                              onMouseLeave={(e) => e.currentTarget.style.transform = "translate(-12px, -24px) scale(1)"}
                            >
                              <path
                                d="M12 0C7.58 0 4 3.58 4 8c0 5.25 8 16 8 16s8-10.75 8-16c0-4.42-3.58-8-8-8zm0 11.5c-1.93 0-3.5-1.57-3.5-3.5S10.07 4.5 12 4.5 15.5 6.07 15.5 8 13.93 11.5 12 11.5z"
                                fill={isFirst ? "#db9ebb" : "#2d4a22"}
                              />
                              <text
                                y="-5"
                                x="12"
                                textAnchor="middle"
                                fill={isFirst ? "#db9ebb" : "#2d4a22"}
                                fontSize="14px"
                                fontWeight="bold"
                                style={{ textShadow: "1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff" }}
                              >
                                {rankIndex + 1}위
                              </text>
                            </g>
                          </Marker>
                        );
                      })}
                    </>
                  );
                }}
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>

          <Tooltip id="map-tooltip" />
        </section>

        <aside className="right-panel">
          <div className="results-head">
            <h2> {isEnglish ? "Top 5 Results" : "추천 결과 Top 5"}</h2>
            <p> {apiStatus.error ? (isEnglish ? "Using local fallback data." : "API 연결 실패 시 로컬 예시 데이터를 표시합니다.") : (isEnglish ? "Calculated from the five category weights." : "5개의 카테고리를 기반으로 계산되었습니다.")}</p>
          </div>
          <div className="result-tabs">
            <button className="active">{isEnglish ? "Results" : "추천 결과"}</button>
            <button onClick={shareCurrent}>⌘ {isEnglish ? "Share" : "공유"}</button>
          </div>
          <div className="result-list">
            {rankings.map((region, index) => (
              <RecommendationCard
                key={region.id}
                region={region}
                rank={index + 1}
                selected={selectedRegion.id === region.id}
                isEnglish={isEnglish}
                isSenior={isSenior}
                isDetail={isDetail}
                onSelect={() => setSelectedRegionId(region.id)}
                onDetail={() => openDetail(region)}
                onNaver={(event) => openNaverMap(region, event)}
              />
            ))}
          </div>
        </aside>
      </section>

      {detailRegion && (
        <DetailModal
          region={detailRegion}
          mode={mode}
          isEnglish={isEnglish}
          weights={weights}
          presetId={PRESET_ID_MAP[selectedPreset] || selectedPreset}
          onClose={() => setDetailRegion(null)}
          onOpenMap={(event) => openNaverMap(detailRegion, event)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function RecommendationCard({ region, rank, selected, isEnglish, isSenior, isDetail, onSelect, onDetail, onNaver }) {
  const percent = clampScore(region.finalScore);
  const displayName = getRegionDisplayName(region, isEnglish);
  const parentName = (isEnglish ? region.parentRegionNameEn : region.parentRegionNameKo) || "";
  const shouldShowParentSub = parentName && !displayName.includes(parentName);
  const isSimple = !isDetail && !isSenior;
  const actionLabel = isSimple
    ? (isEnglish ? "Naver Map" : "네이버 지도")
    : (isEnglish ? "View Details" : "상세 보기");
  const handleAction = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isSimple) {
      onNaver?.(event);
      return;
    }

    onDetail?.();
  };
  return (
    <article className={`result-card ${selected ? "selected" : ""}`} onClick={onSelect}>
      <span className="rank-num">#{rank}</span>
      <div className="result-main">
        <div className="score-ring" style={{ "--score": percent }}>
          <span>{(region.finalScore / 10).toFixed(1)}<small>/10</small></span>
        </div>
        <div className="result-text">
          <h3>{displayName}</h3>
          {shouldShowParentSub && <p className="region-sub">{parentName}</p>}
          <p>{isEnglish ? "This region matches your current preferences." : isSenior ? region.seniorReason : region.reason}</p>
        </div>
      </div>
      <div className="result-bottom">
        <span>finalScore <b>{percent}%</b></span>
        <button type="button" onClick={handleAction}>{actionLabel}</button>
      </div>
      {isDetail && (
        <div className="mini-scores">
          {CATEGORIES.map((cat) => <span key={cat.key}>{isEnglish ? cat.en : cat.ko} {region.scores[cat.key]}</span>)}
        </div>
      )}
    </article>
  );
}

function RadarChart({ scores, isEnglish = false }) {
  const size = 420;
  const center = size / 2;
  const radius = 118;
  const labelRadius = 162;

  const getRadarLabel = (point) => {
    if (isEnglish) return [point.en];
    if (point.key === "culture") return ["문화·여가", "디지털"];
    return [point.ko];
  };

  const axis = CATEGORIES.map((cat, index) => {
    const angle = (Math.PI * 2 * index) / CATEGORIES.length - Math.PI / 2;
    return {
      ...cat,
      angle,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * labelRadius,
      labelY: center + Math.sin(angle) * labelRadius,
    };
  });

  const gridPolygons = [0.25, 0.5, 0.75, 1].map((ratio) =>
    axis.map((point) => `${center + Math.cos(point.angle) * radius * ratio},${center + Math.sin(point.angle) * radius * ratio}`).join(" ")
  );

  const dataPoints = axis
    .map((point) => {
      const valueRadius = radius * (scores[point.key] / 100);
      return `${center + Math.cos(point.angle) * valueRadius},${center + Math.sin(point.angle) * valueRadius}`;
    })
    .join(" ");

  return (
    <svg className="radar-svg" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={isEnglish ? "Five category radar chart" : "5대 카테고리 방사형 차트"}>
      {gridPolygons.map((points, index) => (
        <polygon key={index} points={points} className="radar-grid" />
      ))}
      {axis.map((point) => (
        <line key={point.key} x1={center} y1={center} x2={point.x} y2={point.y} className="radar-axis" />
      ))}
      <polygon points={dataPoints} className="radar-area" />
      {axis.map((point) => {
        const valueRadius = radius * (scores[point.key] / 100);
        const cx = center + Math.cos(point.angle) * valueRadius;
        const cy = center + Math.sin(point.angle) * valueRadius;
        return <circle key={point.key} cx={cx} cy={cy} r="5" className="radar-dot" />;
      })}
      {axis.map((point) => {
        const lines = getRadarLabel(point);
        return (
          <text key={`${point.key}-label`} x={point.labelX} y={point.labelY} textAnchor="middle" dominantBaseline="middle" className="radar-label">
            {lines.map((line, idx) => (
              <tspan key={line} x={point.labelX} dy={idx === 0 ? 0 : 17}>{line}</tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}

function DetailModal({ region, mode, isEnglish, weights, presetId, onClose, onOpenMap }) {
  const isSenior = mode === "senior";
  const displayName = getRegionDisplayName(region, isEnglish);
  return (
    <div className="modal-backdrop">
      <section className={`detail-modal ${isSenior ? "senior-modal" : ""}`}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="닫기">×</button>
        <header className="detail-header">
          <p>{isEnglish ? "Region Detail Panel" : "지역 상세 패널"}</p>
          <h1>{displayName}</h1>
          <span>{isEnglish ? "Selected region" : region.en}</span>
        </header>
        <div className="detail-body">
          <aside className="detail-left">
            <div className="region-image-card">
              {region.logoUrl ? (
                <img
                  src={region.logoUrl}
                  alt={isEnglish ? `${displayName} logo` : `${displayName} 로고`}
                  /* 🚨 마법의 스타일 추가: 삐져나오지 않고 박스 안에 쏙 들어가게 맞춤! */
                  style={{ width: "100%", height: "100%", maxHeight: "80px", objectFit: "contain" }}
                />
              ) : (
                <span>{isEnglish ? region.en : region.short}</span>
              )}
            </div>
            <div className="detail-description">
              {region.reasons?.[0] || (isEnglish
                ? "High contribution from daily convenience and culture, leisure, and digital indicators makes this area suitable for long-stay tourism."
                : "생활편의와 문화·여가·디지털 지표 기여도가 높아 장기체류 관광에 적합합니다.")}
            </div>
            <button type="button" className="naver-button" onClick={onOpenMap}>{isEnglish ? "Open Naver Map" : "Naver 지도 열기"}</button>
          </aside>
          <main className="detail-right">
            <div className="bars">
              {CATEGORIES.map((cat) => (
                <div className="bar-row" key={cat.key}>
                  <div><b>{isEnglish ? cat.en : `${cat.ko} / ${cat.en}`}</b><span>{region.scores[cat.key]}</span></div>
                  <div className="bar-bg"><div className="bar-fill" style={{ width: `${region.scores[cat.key]}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="radar-panel">
              <div className="radar-title"><span>◷</span><h3>{isEnglish ? "5 Category Radar Chart" : "5대 카테고리 방사형 차트"}</h3></div>
              <RadarChart scores={region.scores} isEnglish={isEnglish} />
            </div>
            {mode === "detail" && (
              <RagInsightPanel
                region={region}
                weights={weights}
                presetId={presetId}
                isEnglish={isEnglish}
              />
            )}
          </main>
        </div>
      </section>
    </div>
  );
}

function HelpCenter({ helpTab, setHelpTab, language, setLanguage, onStart }) {
  const isEnglish = language === "en";
  return (
    <main className="help-shell">
      <header className="help-top">
        <button className="help-logo-button" onClick={() => window.location.reload()} aria-label="MEOMUM 새로고침">
          <img src={logoImage} alt="MEOMUM" />
        </button>
        <div className="help-language-toggle">
          <button className={language === "ko" ? "active" : ""} onClick={() => setLanguage("ko")}>한국어</button>
          <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>English</button>
        </div>
      </header>
      <div className="help-layout">
        <aside className="help-side">
          <h2>{isEnglish ? "Help Center" : "도움말 센터"}</h2>
          <p>{isEnglish ? "Regional Guide" : "지역 가이드"}</p>
          <button className={helpTab === "service" ? "active" : ""} onClick={() => setHelpTab("service")}><span className="nav-icon">i</span>{isEnglish ? "Service Info" : "서비스 안내"}</button>
          <button className={helpTab === "indicator" ? "active" : ""} onClick={() => setHelpTab("indicator")}><span className="nav-icon">▥</span>{isEnglish ? "Indicator Info" : "주요 지표"}</button>
          <button className={helpTab === "contact" ? "active" : ""} onClick={() => setHelpTab("contact")}><span className="nav-icon">?</span>{isEnglish ? "Contact" : "문의하기"}</button>
        </aside>
        <section className={`help-content ${helpTab === "indicator" ? "wide" : ""}`}>
          {helpTab === "service" && <ServiceInfo onStart={onStart} isEnglish={isEnglish} />}
          {helpTab === "indicator" && <IndicatorInfo isEnglish={isEnglish} />}
          {helpTab === "contact" && <Contact isEnglish={isEnglish} />}
        </section>
      </div>
    </main>
  );
}

function ServiceInfo({ onStart, isEnglish }) {
  return (
    <div className="service-page">
      <span className="intro-label">{isEnglish ? "INTRODUCTION" : "서비스 소개"}</span>
      <h1>{isEnglish ? "MEOMUM Service Guide" : "머묾 서비스 안내"}</h1>
      <div className="hero-visual image-hero" aria-label="머묾 서비스 안내 이미지 영역">
        <img src={HELP_HERO_URL} alt={isEnglish ? "MEOMUM service landscape" : "머묾 서비스 안내 풍경"} />
      </div>
      <section className="about-box">
        <h2>{isEnglish ? "What is MEOMUM?" : "머묾 서비스란?"}</h2>
        <p>{isEnglish ? "MEOMUM helps long-stay travelers compare Korean regions and choose places that match their stay purpose by combining transport, culture, convenience, safety, and nature indicators." : "머묾은 장기체류 관광자가 국내 지역을 비교하고, 자신의 체류 목적에 맞는 지역을 선택할 수 있도록 교통·문화·생활편의·안전·자연환경 데이터를 종합해 지역별 체류 적합도를 보여주는 서비스입니다."}</p>
      </section>
      <h2 className="section-heading">{isEnglish ? "Main Features" : "주요 기능 안내"}</h2>
      <div className="feature-grid">
        {[
          ["▱", isEnglish ? "Data-based recommendation" : "데이터 기반 지역 추천", isEnglish ? "Suggests suitable regions by analyzing public data and user preferences." : "전국 시·군·구 단위의 공공 데이터를 분석하여 사용자 선호도에 따른 최적의 체류지를 제안합니다."],
          ["⇄", isEnglish ? "Multi-dimensional comparison" : "다차원 비교 분석", isEnglish ? "Compares regions through five major indicators." : "교통, 문화, 생활 인프라 등 5대 지표를 바탕으로 지역 간 차이를 한눈에 파악할 수 있습니다."],
          ["⌖", isEnglish ? "Persona presets" : "맞춤형 페르소나 설정", isEnglish ? "Select presets such as senior stay, nomad, and culture-focused travel." : "워케이션, 시니어 휴양, 로컬 탐방 등 목적별 가중치를 설정해 맞춤형 결과를 도출합니다."],
          ["✓", isEnglish ? "Reliable public data" : "신뢰할 수 있는 공공 데이터", isEnglish ? "Uses public data sources and normalized regional indicators." : "통계청, 국토교통부 등 공공 기관 데이터를 가공해 객관적인 지표를 제공합니다."],
        ].map(([icon, title, desc]) => (
          <article key={title}><i>{icon}</i><h3>{title}</h3><p>{desc}</p></article>
        ))}
      </div>
      <h2 className="section-heading">{isEnglish ? "Data Analysis Areas" : "데이터 분석 영역"}</h2>
      <table className="analysis-table"><tbody>
        <tr><th>{isEnglish ? "Transport" : "교통 인프라"}</th><td>{isEnglish ? "Public transport accessibility, road network, terminal distance" : "대중교통 접근성, 도로망 밀도, 터미널 거리 등"}</td></tr>
        <tr><th>{isEnglish ? "Convenience" : "생활 편의"}</th><td>{isEnglish ? "Medical facilities, pharmacies, public offices" : "의료시설, 마트·시장 분포, 공공기관 접근성 등"}</td></tr>
        <tr><th>{isEnglish ? "Culture" : "문화·관광"}</th><td>{isEnglish ? "Museums, festivals, historic sites, digital access" : "박물관, 미술관, 지역 축제, 역사 유적지 등"}</td></tr>
        <tr><th>{isEnglish ? "Safety & Nature" : "안전·자연"}</th><td>{isEnglish ? "Safety index, green areas, air quality, waterfront access" : "치안 지표, 공원 면적, 대기 질, 수변 공간 인접성 등"}</td></tr>
      </tbody></table>
      <div className="cta-box"><h2>{isEnglish ? "Find your best stay region now" : "지금 바로 최적의 체류지를 찾아보세요"}</h2><button onClick={onStart}>{isEnglish ? "Start region analysis" : "지역 분석 시작하기"}</button></div>
    </div>
  );
}

function IndicatorInfo({ isEnglish }) {
  const columns = isEnglish ? INDICATOR_COLUMNS.en : INDICATOR_COLUMNS.ko;
  const guide = isEnglish ? USER_GUIDE_EN : USER_GUIDE_KO;

  return (
    <div className="indicator-page">
      <h1>{isEnglish ? "Indicator Guide" : "주요 지표 설명"}</h1>
      <p>{isEnglish ? "MEOMUM uses regional data across transport, culture, convenience, safety, and nature. The scores are relative values for comparing regions." : "머묾은 총 교통, 문화, 생활편의, 안전, 자연, 보조지표로 구성된 고도화된 지역 데이터를 활용하여 최적의 거주 및 여행 환경을 제안합니다. 각 지표는 공공 데이터와 전문 분석 알고리즘을 기반으로 산출됩니다."}</p>
      {INDICATOR_SECTIONS.map((section) => {
        const englishSection = INDICATOR_EN_SECTIONS[section.key];
        const title = isEnglish ? englishSection.title : section.title;
        const rows = isEnglish ? englishSection.rows : section.rows;

        return (
          <article className="indicator-section" key={section.key}>
            <h2 className={`section-${section.variant}`}><span className="section-icon">{section.icon}</span>{title}</h2>
            <div className="table-scroll">
              <table>
                <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${section.key}-${index}`}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        );
      })}
      <div className="guide-box">
        <h2>{isEnglish ? "User Guide" : "사용자 안내 문구"}</h2>
        {guide.map((group) => (
          <section className="guide-section" key={group.title}>
            <h3>{group.title}</h3>
            <ul>
              {group.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

function Contact({ isEnglish }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    const subject = encodeURIComponent(isEnglish ? "[Meomum] Inquiry" : "[머무름] 문의");
    const body = encodeURIComponent(
      `${isEnglish ? "Name" : "이름"}: ${name}\n${isEnglish ? "Email" : "이메일"}: ${email}\n\n${message}`
    );
    window.open(`mailto:dktpxmdkalshvps@gmail.com?subject=${subject}&body=${body}`);
    setSent(true);
  };

  return (
    <div className="contact-page">
      <h1>{isEnglish ? "Contact" : "문의하기"}</h1>
      <p>{isEnglish ? "Send your inquiry to the project team." : "서비스 관련 문의는 프로젝트 팀에 전달해 주세요."}</p>
      <input
        placeholder={isEnglish ? "Name" : "이름"}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        placeholder={isEnglish ? "Email" : "이메일"}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <textarea
        placeholder={isEnglish ? "Message" : "문의 내용"}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button onClick={handleSend} disabled={!name || !email || !message}>
        {isEnglish ? "Send" : "보내기"}
      </button>
      {sent && (
        <p className="sent-message">
          {isEnglish
            ? "Email client opened. Please send the email to complete your inquiry."
            : "이메일 클라이언트가 열렸습니다. 이메일을 전송하면 문의가 완료됩니다."}
        </p>
      )}
    </div>
  );
}

export default App;
