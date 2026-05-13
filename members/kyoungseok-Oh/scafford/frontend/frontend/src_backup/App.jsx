import React, { useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { geoCentroid } from "d3-geo";
import * as topojson from "topojson-client";
import "./App.css";
import logoImage from "./assets/meomum-logo.png";

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
  standard: { ko: "표준 체류형", en: "Standard Stay", icon: "♡", weights: { traffic: 20, culture: 20, convenience: 25, safety: 20, nature: 15 } },
  tourist: { ko: "해외 관광객", en: "Foreign Tourist", icon: "◌", weights: { traffic: 15, culture: 30, convenience: 25, safety: 15, nature: 15 } },
  nomad: { ko: "디지털 노마드", en: "Digital Nomad", icon: "♟", weights: { traffic: 20, culture: 30, convenience: 25, safety: 10, nature: 15 } },
  senior: { ko: "액티브 시니어", en: "Active Senior", icon: "⌖", weights: { traffic: 12, culture: 15, convenience: 33, safety: 20, nature: 20 } },
  solo: { ko: "나홀로 문화형", en: "Solo Cultural", icon: "○", weights: { traffic: 18, culture: 35, convenience: 20, safety: 12, nature: 15 } },
};

const REGIONS = [
  { id: "gangwon", ko: "강원특별자치도", en: "Gangwon", short: "강원", scores: { traffic: 38, culture: 78, convenience: 40, safety: 27, nature: 95 }, reason: "자연·문화·여가·디지털 지표가 높아 현재 조건에 잘 맞습니다.", seniorReason: "자연환경이 좋아 조용히 머물기 좋습니다." },
  { id: "gyeonggi", ko: "경기도", en: "Gyeonggi", short: "경기", scores: { traffic: 85, culture: 65, convenience: 82, safety: 80, nature: 48 }, reason: "안전·생활편의 지표가 높아 현재 조건에 잘 맞습니다.", seniorReason: "병원과 약국이 가까워 생활하기 편합니다." },
  { id: "chungbuk", ko: "충청북도", en: "Chungbuk", short: "충북", scores: { traffic: 58, culture: 55, convenience: 61, safety: 78, nature: 86 }, reason: "자연·안전 지표가 높아 현재 조건에 잘 맞습니다.", seniorReason: "안전하고 조용한 체류에 적합합니다." },
  { id: "jeonnam", ko: "전라남도", en: "Jeonnam", short: "전남", scores: { traffic: 52, culture: 82, convenience: 58, safety: 74, nature: 88 }, reason: "문화·여가·디지털·교통 지표가 현재 조건에 잘 맞습니다.", seniorReason: "여유롭고 자연 친화적인 체류에 좋습니다." },
  { id: "gyeongbuk", ko: "경상북도", en: "Gyeongbuk", short: "경북", scores: { traffic: 62, culture: 71, convenience: 73, safety: 79, nature: 80 }, reason: "생활편의·안전 지표가 높아 현재 조건에 잘 맞습니다.", seniorReason: "생활 편의와 안전이 균형 잡힌 지역입니다." },
  { id: "jeju", ko: "제주특별자치도", en: "Jeju", short: "제주", scores: { traffic: 45, culture: 76, convenience: 64, safety: 72, nature: 96 }, reason: "자연환경과 휴양 체류 지표가 뛰어납니다.", seniorReason: "자연을 가까이 느끼며 쉬기 좋은 지역입니다." },
  { id: "seoul", ko: "서울특별시", en: "Seoul", short: "서울", scores: { traffic: 96, culture: 94, convenience: 93, safety: 69, nature: 35 }, reason: "교통·문화·생활편의 인프라가 강합니다.", seniorReason: "의료와 생활 편의 시설이 많습니다." },
  { id: "busan", ko: "부산광역시", en: "Busan", short: "부산", scores: { traffic: 82, culture: 86, convenience: 80, safety: 73, nature: 75 }, reason: "도시 인프라와 해양 관광 자원이 균형 잡혀 있습니다.", seniorReason: "도시 편의와 바다 휴식이 함께 있습니다." },
];

const INDICATOR_SECTIONS = [
  { key: "traffic", title: "교통 (Traffic)", icon: "▣", variant: "green", rows: [ ["버스정류장 접근성", "개소, 좌표", "전국 버스정류장 위치 데이터", "전국 정류장별 Point", "국토교통부", "대중교통 접근성 평가", "2025"] ] },
  { key: "culture", title: "문화 (Culture)", icon: "◇", variant: "plum", rows: [ ["관광숙박 인프라", "업체수", "관광숙박시설 현황", "시도별", "문체부", "숙박 선택지 규모", "2024"] ] },
  { key: "convenience", title: "생활편의 (Convenience)", icon: "▥", variant: "light", rows: [ ["병원 접근성", "개소", "의료기관 기본 목록", "의료기관별", "건강보험심사평가원", "의료서비스 밀도", "2026"] ] },
  { key: "safety", title: "안전 (Safety)", icon: "◉", variant: "green", rows: [ ["지역안전지수", "등급 1~5", "6개 분야 안전수준", "시도별", "행정안전부", "안전 체감 수준", "2025"] ] },
  { key: "nature", title: "자연 (Nature)", icon: "◌", variant: "green", rows: [ ["녹지비율", "%", "녹지면적비율", "시도별", "환경공간정보서비스", "체감 자연환경", "2025"] ] },
];

const INDICATOR_EN_SECTIONS = {
  traffic: { title: "Transport", rows: [ ["Bus stop access", "Count", "Location data", "Point", "MOLIT", "Mobility index", "2025"] ] },
  culture: { title: "Culture", rows: [ ["Lodging", "Count", "Accommodation data", "Province", "MCST", "Stay options", "2024"] ] },
  convenience: { title: "Convenience", rows: [ ["Hospital access", "Count", "Medical list", "Facility", "HIRA", "Medical density", "2026"] ] },
  safety: { title: "Safety", rows: [ ["Safety index", "Grade", "Safety levels", "Province", "MOIS", "Perceived safety", "2025"] ] },
  nature: { title: "Nature", rows: [ ["Green ratio", "%", "Green area", "Province", "ESIS", "Environment", "2025"] ] },
};

const INDICATOR_COLUMNS = {
  ko: ["지표명", "단위", "지표내용", "데이터레벨", "자료출처", "지표 설명글", "자료 시점"],
  en: ["Indicator", "Unit", "Description", "Data level", "Source", "Interpretation", "Data year"],
};

const USER_GUIDE_KO = [ { title: "1. 데이터 기준 안내", items: ["공공데이터 기반으로 산출됩니다."] } ];
const USER_GUIDE_EN = [ { title: "1. Data standard notice", items: ["Calculated from public datasets."] } ];

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
  standard: "default", tourist: "foreign_tourist", nomad: "remote_worker", senior: "active_senior", solo: "culture_single_couple",
};

const REGION_LOGO_MAP = [
  [/서울|Seoul/i, "/assets/region_logo/Seoul.svg"],
  [/부산|Busan/i, "/assets/region_logo/Busan.svg"],
  [/경기|Gyeonggi/i, "/assets/region_logo/Gyeonggi.svg"],
  [/강원|Gangwon/i, "/assets/region_logo/Gangwon.png"],
];

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

function normalizeApiRegion(item, weights) {
  const scores = item.categoryScores || item.category_scores || item.scores || {};
  const ko = item.regionNameKo || item.region_name_ko || item.regionName || item.name_ko || item.ko || "지역";
  const en = item.regionNameEn || item.region_name_en || item.name_en || item.en || ko;
  const parentKo = item.parentRegionNameKo || item.parent_region_name_ko || item.parent_ko || item.sido_name_ko || "";
  const reasons = item.reasons || item.reason || [];
  const reasonText = Array.isArray(reasons) ? reasons[0] : reasons;
  const final = item.finalScore ?? item.final_score ?? calcFinalScore(scores, weights);
  const region = {
    id: item.region_id || item.regionId || item.id,
    ko, en, short: item.shortName || item.short_name || ko.replace(/특별자치도|특별자치시|특별시|광역시|시|군|구/g, "").slice(0, 6),
    parentRegionNameKo: parentKo,
    scores: {
      traffic: Number(scores.traffic ?? 0), culture: Number(scores.culture ?? 0), convenience: Number(scores.convenience ?? 0),
      safety: Number(scores.safety ?? 0), nature: Number(scores.nature ?? 0),
    },
    finalScore: clampScore(final),
    reason: reasonText || "가중치와 지역 지표를 기반으로 추천된 지역입니다.",
    seniorReason: reasonText || "생활 편의와 체류 적합도를 고려한 추천 지역입니다.",
    naverMap: item.naverMap || item.naver_map || {},
    touristSpots: item.touristSpots || item.tourist_spots || [],
    raw: item.raw || [], categories: item.categories || null,
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

// 🌟 색상 스케일 정의 (0점: 연녹색 -> 100점: 진녹색)
const colorScale = scaleLinear()
  .domain([0, 100])
  .range(["#F0F4ED", "#2D4A22"]);

// ==========================================
// App 컴포넌트 시작
// ==========================================
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
  const [remoteRankings, setRemoteRankings] = useState([]);
  const [apiStatus, setApiStatus] = useState({ loading: false, error: "" });

  // 🌟 SVG 지도 관련 상태들
  const [position, setPosition] = useState({ coordinates: [127.5, 36.0], zoom: 1 });
  const [tooltipContent, setTooltipContent] = useState("");
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [geoData, setGeoData] = useState(null);

  // 🌟 1. 지형 데이터 미리 불러오기
  useEffect(() => {
    fetch("https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2018/json/skorea-municipalities-2018-topo-simple.json")
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error("지도 데이터를 불러오지 못했습니다.", err));
  }, []);

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

  // 🌟 2. 선택된 지역이 바뀔 때마다 지도가 자동으로 이동(포커싱)하는 로직
  useEffect(() => {
    if (!selectedRegionId || !geoData || !rankings.length) return;

    const targetRegion = rankings.find(r => r.id === selectedRegionId);
    if (!targetRegion) return;

    try {
      // 👇 이 부분이 해결의 핵심입니다! (파일 안의 객체 이름이 달라도 무조건 찾아냄)
      const objectKey = Object.keys(geoData.objects)[0]; 
      const islands = topojson.feature(geoData, geoData.objects[objectKey]);
      
      const targetGeo = islands.features.find(f => {
        const name = f.properties.name || f.properties.SIG_KOR_NM;
        // 예: "수원시 장안구"와 "경기도 수원시" 매칭
        return targetRegion.ko.includes(name) || name.includes(targetRegion.ko);
      });

      if (targetGeo) {
        const centroid = geoCentroid(targetGeo);
        setPosition({ coordinates: centroid, zoom: 3.5 });
      }
    } catch (e) {
      console.error("Auto-pan error:", e);
    }
  }, [selectedRegionId, geoData, rankings]);

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
    const safeValue = Number.isFinite(numericValue) ? Math.max(0, Math.min(100, numericValue)) : 0;
    setHasCustomWeights(true);
    setWeights((prev) => ({ ...prev, [key]: safeValue }));
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

  function openNaverMap(region) {
    const url = region?.naverMap?.webUrl || region?.naverMap?.web_url || `https://map.naver.com/p/search/${encodeURIComponent(region.ko)}`;
    window.open(url, "_blank");
  }

  async function shareCurrent() {
    const url = `${window.location.origin}?mode=${mode}&lang=${language}&region=${selectedRegion.id}`;
    await navigator.clipboard?.writeText(url);
    showToast(isEnglish ? "Share link copied." : "공유 링크가 복사되었습니다.");
  }

  function handleZoomIn() {
    if (position.zoom >= 6) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom * 1.5 }));
  }
  function handleZoomOut() {
    if (position.zoom <= 1) return;
    setPosition((pos) => ({ ...pos, zoom: pos.zoom / 1.5 }));
  }
  function handleMoveEnd(newPosition) {
    setPosition(newPosition);
  }

  if (view === "help") {
    return (
      <>
        <HelpCenter helpTab={helpTab} setHelpTab={setHelpTab} language={language} setLanguage={setLanguage} onStart={() => setView("dashboard")} />
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
              <button key={item.key} className={mode === item.key ? "active" : ""} onClick={() => handleModeChange(item.key)}>
                {isEnglish ? item.en : item.ko}
              </button>
            );
          })}
          <div className="nav-divider" />
          <button className={language === "ko" ? "active" : ""} onClick={() => setLanguage("ko")}>한국어</button>
          <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>🌐 English</button>
          <button className={view === "help" ? "active" : ""} onClick={() => { setView("help"); setHelpTab("service"); }}>ⓘ {isEnglish ? "Help" : "도움말"}</button>
        </nav>
      </header>

      <section className="dashboard-layout">
        <aside className="left-panel">
          <section className="soft-card preset-card">
            <div className="card-title">⚡ {isEnglish ? "Presets" : "프리셋"}</div>
            <div className="preset-list">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button key={key} className={`preset-item ${selectedPreset === key ? "selected" : ""}`} onClick={() => applyPreset(key)}>
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
                    <label className="weight-number-wrap">
                      <input className="weight-number-input" type="number" min="0" max="100" value={weights[category.key]} onChange={(e) => updateWeight(category.key, e.target.value)} onBlur={(e) => updateWeight(category.key, e.target.value)} />
                    </label>
                  </div>
                  <input type="range" min="0" max="100" value={weights[category.key]} onChange={(e) => updateWeight(category.key, e.target.value)} />
                  <div className="slider-scale"><span>Low</span><span>High</span></div>
                </div>
              ))}
            </div>
            <div className="weight-actions">
              <span>{isEnglish ? "Applied to all calculations" : "전체 결과에 반영됨"}</span>
              <button onClick={resetWeights}>↻ Reset</button>
            </div>
          </section>
        </aside>

        <section className="map-card">
          <div className="map-badge">🗺️ {isEnglish ? "Interactive Data Map" : "데이터 기반 추천 지도"}{apiStatus.loading ? (isEnglish ? " · Loading" : " · 계산 중") : ""}</div>
          <div className="zoom-controls">
            <button aria-label="지도 확대" onClick={handleZoomIn}>＋</button>
            <button aria-label="지도 축소" onClick={handleZoomOut}>－</button>
          </div>
          
          <div
            className="map-wrap"
            onMouseMove={(e) => {
              // 🌟 툴팁이 화면 밖으로 나가지 않도록 똑똑하게 위치를 계산합니다
              const x = e.clientX;
              const y = e.clientY;
              
              // 마우스가 화면 오른쪽 끝이나 아래쪽 끝에 가까운지 확인 (여백 확보)
              const isRightEdge = x > window.innerWidth - 180; 
              const isBottomEdge = y > window.innerHeight - 60;

              setTooltipPos({ 
                // 오른쪽 끝이면 마우스 왼쪽(-140px)으로, 아니면 오른쪽(+15px)으로
                x: isRightEdge ? x - 140 : x + 15, 
                // 아래쪽 끝이면 마우스 위쪽(-40px)으로, 아니면 아래쪽(+15px)으로
                y: isBottomEdge ? y - 40 : y + 15  
              });
            }}
            style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }}
          >
            {geoData && (
              <ComposableMap projection="geoMercator" projectionConfig={{ rotate: [-127.5, -36, 0], scale: 5500 }} style={{ width: "100%", height: "100%" }}>
                <ZoomableGroup zoom={position.zoom} center={position.coordinates} onMoveEnd={handleMoveEnd}>
                  <Geographies geography={geoData}>
                    {({ geographies }) => {
                      const SIDO_PREFIX = { "11": "서울", "26": "부산", "27": "대구", "28": "인천", "29": "광주", "30": "대전", "31": "울산", "36": "세종", "41": "경기", "42": "강원", "43": "충북", "44": "충남", "45": "전북", "46": "전남", "47": "경북", "48": "경남", "50": "제주", "51": "강원", "52": "전북" };
                      return geographies.map((geo) => {
                        const regionName = geo.properties.name || geo.properties.SIG_KOR_NM || "";
                        const regionCode = String(geo.properties.code || geo.properties.SIG_CD || "");
                        const sidoName = SIDO_PREFIX[regionCode.substring(0, 2)] || "";

                        const regionData = rankings.find((r) => {
                          const apiName = r.ko || ""; 
                          const apiParent = r.parentRegionNameKo || ""; 
                          const fullApiName = `${apiParent} ${apiName}`; 

                          if (fullApiName.includes("세종") && regionName.includes("세종")) return true;
                          const isSidoMatch = sidoName ? fullApiName.includes(sidoName) : true;
                          if (!isSidoMatch) return false;
                          if (regionName.includes(apiName) || apiName.includes(regionName)) return true;
                          const apiParts = apiName.split(" ");
                          const localName = apiParts[apiParts.length - 1]; 
                          return regionName.includes(localName) || localName.includes(regionName);
                        });

                        const isSelected = selectedRegionId === regionData?.id;
                        const rank = regionData ? rankings.findIndex(r => r.id === regionData.id) + 1 : null;

                        return (
                          <React.Fragment key={geo.rsmKey}>
                            <Geography
                              geography={geo}
                              fill={regionData ? colorScale(regionData.finalScore) : "#E5E7EB"}
                              stroke={isSelected ? "#22c55e" : "#FFFFFF"}
                              strokeWidth={isSelected ? (2 / position.zoom) : (0.5 / position.zoom)}
                              onClick={() => {
                                if (regionData) {
                                  setSelectedRegionId(regionData.id);
                                  const centroid = geoCentroid(geo);
                                  setPosition({ coordinates: centroid, zoom: 3.5 });
                                }
                              }}
                              onMouseEnter={() => {
                            if (regionData) {
                              // 언어에 따라 명칭과 단위 변경
                              const name = isEnglish ? regionData.en : regionData.ko;
                              const unit = isEnglish ? "pts" : "점";
                              setTooltipContent(`${name} : ${Math.round(regionData.finalScore)}${unit}`);
                            } else if (regionName) {
                              setTooltipContent(regionName);
                            }
                          }}
                              onMouseLeave={() => setTooltipContent("")}
                              style={{ default: { outline: "none", transition: "all 0.3s" }, hover: { fill: "#97B986", outline: "none", cursor: "pointer" }, pressed: { outline: "none" } }}
                            />
                            {rank && rank <= 5 && (
                              <Marker coordinates={geoCentroid(geo)}>
                                <g className="map-marker-group">
                                  <circle r={12 / position.zoom} className="marker-bg" />
                                  <text textAnchor="middle" y={4 / position.zoom} style={{ fontSize: `${10 / position.zoom}px` }} className="marker-text">{rank}</text>
                                </g>
                              </Marker>
                            )}
                          </React.Fragment>
                        );
                      });
                    }}
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>
            )}

            {tooltipContent && <div className="map-tooltip" style={{ left: tooltipPos.x + 15, top: tooltipPos.y + 15 }}>{tooltipContent}</div>}
          </div>

          {selectedRegion && (
            <div className="selected-info-popup">
              <div className="popup-rank">
                #{rankings.findIndex(r => r.id === selectedRegion.id) + 1}
              </div>
              <div className="popup-content">
                {/* 언어에 따라 ko 또는 en 명칭 출력 */}
                <strong>{isEnglish ? selectedRegion.en : selectedRegion.ko}</strong>
                <p>
                  {Math.round(selectedRegion.finalScore)}{isEnglish ? " pts" : "점"} · {isEnglish ? (selectedRegion.parentRegionNameEn || "South Korea") : selectedRegion.parentRegionNameKo}
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className="right-panel">
          <div className="results-head">
            <h2>🏆 {isEnglish ? "Top 5 Results" : "추천 결과 Top 5"}</h2>
            <p>{apiStatus.error ? (isEnglish ? "Using local fallback data." : "API 연결 실패 시 로컬 예시 데이터를 표시합니다.") : (isEnglish ? "Calculated from the five category weights." : "5대 카테고리 가중치를 기반으로 계산되었습니다.")}</p>
          </div>
          <div className="result-tabs">
            <button className="active">⚡ {isEnglish ? "Results" : "추천 결과"}</button>
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
              />
            ))}
          </div>
        </aside>
      </section>

      {detailRegion && <DetailModal region={detailRegion} mode={mode} isEnglish={isEnglish} onClose={() => setDetailRegion(null)} onOpenMap={() => openNaverMap(detailRegion)} />}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

function RecommendationCard({ region, rank, selected, isEnglish, isSenior, isDetail, onSelect, onDetail }) {
  const percent = clampScore(region.finalScore);
  return (
    <article className={`result-card ${selected ? "selected" : ""}`} onClick={onSelect}>
      <span className="rank-num">#{rank}</span>
      <div className="result-main">
        <div className="score-ring" style={{ "--score": percent }}><span>{(region.finalScore / 10).toFixed(1)}<small>/10</small></span></div>
        <div className="result-text">
          <h3>{isEnglish ? region.en : region.ko}</h3>
          <p className="region-sub">{isEnglish ? region.en : region.ko}</p>
          <p>{isEnglish ? "This region matches your preferences." : isSenior ? region.seniorReason : region.reason}</p>
        </div>
      </div>
      <div className="result-bottom">
        <span>finalScore <b>{percent}%</b></span>
        <button onClick={(event) => { event.stopPropagation(); onDetail(); }}>{isEnglish ? "View Details" : "상세 보기"}</button>
      </div>
      {isDetail && <div className="mini-scores">{CATEGORIES.map((cat) => <span key={cat.key}>{isEnglish ? cat.en : cat.ko} {region.scores[cat.key]}</span>)}</div>}
    </article>
  );
}

function RadarChart({ scores, isEnglish = false }) {
  const size = 420; const center = size / 2; const radius = 118; const labelRadius = 162;
  const getRadarLabel = (point) => { if (isEnglish) return [point.en]; if (point.key === "culture") return ["문화·여가", "디지털"]; return [point.ko]; };
  const axis = CATEGORIES.map((cat, index) => {
    const angle = (Math.PI * 2 * index) / CATEGORIES.length - Math.PI / 2;
    return { ...cat, angle, x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius, labelX: center + Math.cos(angle) * labelRadius, labelY: center + Math.sin(angle) * labelRadius };
  });
  const gridPolygons = [0.25, 0.5, 0.75, 1].map((ratio) => axis.map((point) => `${center + Math.cos(point.angle) * radius * ratio},${center + Math.sin(point.angle) * radius * ratio}`).join(" "));
  const dataPoints = axis.map((point) => { const valueRadius = radius * (scores[point.key] / 100); return `${center + Math.cos(point.angle) * valueRadius},${center + Math.sin(point.angle) * valueRadius}`; }).join(" ");
  return (
    <svg className="radar-svg" viewBox={`0 0 ${size} ${size}`}>
      {gridPolygons.map((points, index) => <polygon key={index} points={points} className="radar-grid" />)}
      {axis.map((point) => <line key={point.key} x1={center} y1={center} x2={point.x} y2={point.y} className="radar-axis" />)}
      <polygon points={dataPoints} className="radar-area" />
      {axis.map((point) => { const valueRadius = radius * (scores[point.key] / 100); return <circle key={point.key} cx={center + Math.cos(point.angle) * valueRadius} cy={center + Math.sin(point.angle) * valueRadius} r="5" className="radar-dot" />; })}
      {axis.map((point) => { const lines = getRadarLabel(point); return <text key={`${point.key}-label`} x={point.labelX} y={point.labelY} textAnchor="middle" dominantBaseline="middle" className="radar-label">{lines.map((line, idx) => <tspan key={line} x={point.labelX} dy={idx === 0 ? 0 : 17}>{line}</tspan>)}</text>; })}
    </svg>
  );
}

function DetailModal({ region, mode, isEnglish, onClose, onOpenMap }) {
  const isSenior = mode === "senior";
  return (
    <div className="modal-backdrop">
      <section className={`detail-modal ${isSenior ? "senior-modal" : ""}`}>
        <button className="modal-close" onClick={onClose}>×</button>
        <header className="detail-header"><p>{isEnglish ? "Detail Panel" : "지역 상세"}</p><h1>{isEnglish ? region.en : region.short}</h1><span>{isEnglish ? "Selected" : region.en}</span></header>
        <div className="detail-body">
          <aside className="detail-left">
            <div className="region-image-card">{region.logoUrl ? <img src={region.logoUrl} alt="logo" /> : <span>{isEnglish ? region.en : region.short}</span>}</div>
            <div className="detail-description">{isEnglish ? "Recommendation based on weights." : isSenior ? region.seniorReason : `${region.reason} 데이터 기반 추천 결과입니다.`}</div>
            <button className="naver-button" onClick={onOpenMap}>{isEnglish ? "Open Naver Map" : "Naver 지도 열기"}</button>
          </aside>
          <main className="detail-right">
            <div className="bars">{CATEGORIES.map((cat) => <div className="bar-row" key={cat.key}><div><b>{isEnglish ? cat.en : cat.ko}</b><span>{region.scores[cat.key]}</span></div><div className="bar-bg"><div className="bar-fill" style={{ width: `${region.scores[cat.key]}%` }} /></div></div>)}</div>
            <div className="radar-panel"><div className="radar-title"><span>◷</span><h3>{isEnglish ? "Radar Chart" : "방사형 차트"}</h3></div><RadarChart scores={region.scores} isEnglish={isEnglish} /></div>
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

// 🌟 [데이터 복구] 누락되었던 전체 지표 데이터 리스트입니다.
const FULL_INDICATOR_SECTIONS = [
  {
    key: "traffic",
    title: "교통 (Traffic)",
    icon: "▣",
    variant: "green",
    rows: [
      ["버스정류장 접근성", "개소, 좌표", "전국 버스정류장 위치 데이터", "전국 정류장별 Point", "국토교통부", "대중교통 접근성과 이동 편의성 평가", "2025"],
      ["철도역 접근성", "개소, 노선 수", "철도역 위치·운행 특성 데이터", "철도역별 Point", "국가철도공단", "KTX/SRT 및 광역 철도망 접근성", "2025"],
    ],
  },
  {
    key: "culture",
    title: "문화·여가·디지털 (Culture)",
    icon: "◇",
    variant: "plum",
    rows: [
      ["관광숙박 인프라", "업체수, 객실수", "관광숙박시설 현황 데이터", "시도별·업종별", "문화체육관광부", "장기체류용 숙박 선택지 규모", "2024"],
      ["도시공원 접근성", "개소, ㎡", "전국 도시공원 데이터", "공원별 Point", "전국도시공원정보표준", "산책 및 야외 활동 지원 인프라", "2025"],
      ["5G 통신 품질", "Mbps", "17개 시도별 5G 전송속도", "시도별", "과학기술정보통신부", "원격근무 및 디지털 체류 편의성", "2024"],
      ["공공 와이파이 접근성", "개소", "전국 공공 무료 와이파이 정보", "설치지점별 Point", "행정안전부", "공공공간 디지털 접속성", "2025"],
    ],
  },
  {
    key: "convenience",
    title: "생활편의 (Convenience)",
    icon: "▥",
    variant: "light",
    rows: [
      ["병원 접근성", "개소, 명", "의료기관 기본 목록", "의료기관별 Point", "건강보험심사평가원", "인근 의료기관 밀도 및 진료 역량", "2026"],
      ["약국 접근성", "개소", "전국 약국 기본 목록", "약국별 Point", "건강보험심사평가원", "의약품 구매 및 처방 접근성", "2026"],
      ["의료시설 수용역량", "병상수", "병상·응급실 등 시설 현황", "의료기관별", "건강보험심사평가원", "응급·입원 대응 가능성 평가", "2026"],
      ["행정민원시설 접근성", "개소", "행정복지센터·주민센터 현황", "시설/주소", "행정안전부", "행정 처리 및 지역 지원 편의성", "2025"],
    ],
  },
  {
    key: "safety",
    title: "안전 (Safety)",
    icon: "◉",
    variant: "green",
    rows: [
      ["지역안전지수", "등급 1~5", "화재, 범죄 등 6개 분야 안전수준", "시도/시군구", "행정안전부", "지역 선택 시 체감 안전 수준", "2025"],
    ],
  },
  {
    key: "nature",
    title: "자연 (Nature)",
    icon: "◌",
    variant: "green",
    rows: [
      ["월별 기온 특성", "℃", "평균·최고·최저기온 통계", "관측지점별", "기상청", "기후 쾌적성 및 야외활동 적합성", "2025"],
      ["지역당 녹지비율", "%", "녹지면적 및 행정구역 면적", "시도별", "환경공간정보서비스", "체감 자연환경 수준 및 쾌적성", "2025"],
      ["미세먼지 PM10 농도", "㎍/㎥", "월평균 PM10 대기질 데이터", "도시별", "KOSIS", "건강 부담 및 야외활동 적합성", "2024"],
      ["오존 농도", "ppm", "오존 주의보·경보 발령 현황", "시도별", "한국환경공단", "대기환경 부담 보조 지표", "2025"],
    ],
  },
];

// 🌟 영어 버전 데이터 리스트
const FULL_INDICATOR_EN_SECTIONS = {
  traffic: {
    title: "Transport (Traffic)",
    rows: [
      ["Bus stop access", "Count", "Public bus stop location data", "Point", "MOLIT", "Evaluation of transit accessibility", "2025"],
      ["Train station access", "Count", "Railway station location data", "Point", "KR", "Access to KTX/SRT networks", "2025"],
    ]
  },
  culture: {
    title: "Culture & Digital",
    rows: [
      ["Lodging infra", "Count", "Tourism accommodation data", "Province", "MCST", "Scale of stay options", "2024"],
      ["Urban parks", "m²", "Urban park data", "Point", "National Data", "Outdoor activity infrastructure", "2025"],
      ["5G Quality", "Mbps", "5G transmission speed", "Province", "MSIT", "Digital stay convenience", "2024"],
      ["Public Wi-Fi", "Count", "Public Wi-Fi locations", "Point", "MOIS", "Public digital connectivity", "2025"],
    ]
  },
  convenience: {
    title: "Daily Convenience",
    rows: [
      ["Hospital access", "Count", "Medical institution list", "Point", "HIRA", "Medical service density", "2026"],
      ["Pharmacy access", "Count", "Pharmacy list", "Point", "HIRA", "Medicine purchase accessibility", "2026"],
      ["Medical capacity", "Beds", "Hospital facility status", "Facility", "HIRA", "Emergency response capacity", "2026"],
      ["Admin services", "Count", "Community service centers", "Address", "MOIS", "Administrative support convenience", "2025"],
    ]
  },
  safety: {
    title: "Safety",
    rows: [
      ["Safety Index", "Grade", "Safety levels (Fire, Crime, etc.)", "City/County", "MOIS", "Perceived regional safety", "2025"],
    ]
  },
  nature: {
    title: "Nature & Environment",
    rows: [
      ["Temperature", "℃", "Average/Max/Min temperature", "Station", "KMA", "Climate comfort", "2025"],
      ["Green area ratio", "%", "Green area vs. Admin area", "Province", "ESIS", "Natural environment comfort", "2025"],
      ["Fine Dust (PM10)", "㎍/㎥", "Monthly average PM10", "City", "KOSIS", "Air quality suitability", "2024"],
      ["Ozone", "ppm", "Ozone warning status", "Province", "KECO", "Air environment burden", "2025"],
    ]
  }
};

function IndicatorInfo({ isEnglish }) {
  const columns = isEnglish 
    ? ["Indicator", "Unit", "Description", "Data level", "Source", "Interpretation", "Data year"] 
    : ["지표명", "단위", "지표내용", "데이터레벨", "자료출처", "지표 설명글", "자료 시점"];

  return (
    <div className="indicator-page">
      <h1>{isEnglish ? "Indicator Guide" : "주요 지표 설명"}</h1>
      <p>
        {isEnglish 
          ? "MEOMUM uses high-level regional data including transport, culture, convenience, safety, and nature indicators to suggest the best environment." 
          : "머묾은 총 교통, 문화, 생활편의, 안전, 자연, 보조지표로 구성된 고도화된 지역 데이터를 활용하여 최적의 거주 및 여행 환경을 제안합니다."}
      </p>

      {/* 1. 데이터 지표 섹션 (기존과 동일하게 유지) */}
      {FULL_INDICATOR_SECTIONS.map((section) => {
        const enSection = FULL_INDICATOR_EN_SECTIONS[section.key];
        const title = isEnglish ? enSection.title : section.title;
        const rows = isEnglish ? enSection.rows : section.rows;

        return (
          <article className="indicator-section" key={section.key} style={{ marginTop: '40px' }}>
            <h2 className={`section-${section.variant}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="section-icon">{section.icon}</span>
              {title}
            </h2>
            <div className="table-scroll" style={{ overflowX: 'auto', marginTop: '15px' }}>
              <table className="analysis-table">
                <thead>
                  <tr>
                    {columns.map((column) => <th key={column}>{column}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${section.key}-${index}`}>
                      {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        );
      })}

      {/* 🌟 2. 사용자 안내 가이드 (내용 완벽 복구) */}
      <div className="guide-box" style={{ marginTop: '60px', padding: '32px', border: '1px solid #c3c8bc', borderRadius: '16px', background: '#f4f4ed' }}>
        <h2 style={{ color: '#2d4a22', marginBottom: '24px' }}>{isEnglish ? "User Guide" : "사용자 안내 문구"}</h2>
        
        <section className="guide-section" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', color: '#43483f' }}>{isEnglish ? "1. Data standard notice" : "1. 데이터 기준 안내"}</h3>
          <ul style={{ lineHeight: '1.8' }}>
            <li>{isEnglish ? "Regional indicators are calculated based on public and processed data." : "머묾의 지역별 지표는 공공데이터와 가공 데이터를 기반으로 산출됩니다."}</li>
            <li>{isEnglish ? "Sources and reference dates vary, so results may differ from real-time conditions." : "각 지표는 자료출처와 기준 시점이 서로 다르므로, 실제 현황과 일부 차이가 있을 수 있습니다."}</li>
            <li>{isEnglish ? "Please use results as reference information for choosing regions." : "추천 결과는 지역 선택을 돕기 위한 참고 정보로 활용해 주세요."}</li>
          </ul>
        </section>

        <section className="guide-section" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '18px', color: '#43483f' }}>{isEnglish ? "2. Score interpretation" : "2. 점수 해석 안내"}</h3>
          <ul style={{ lineHeight: '1.8' }}>
            <li>{isEnglish ? "Higher scores indicate more favorable conditions for long-term stays." : "점수가 높을수록 해당 카테고리에서 장기체류에 유리한 조건을 갖춘 지역으로 해석합니다."}</li>
            <li>{isEnglish ? "For negative indicators (dust, safety index), scores are adjusted to be intuitive." : "다만 미세먼지, 오존, 지역안전지수 등 일부 지표는 원천값이 낮을수록 긍정적인 의미를 가지므로, 서비스에서는 추천 점수에 맞게 방향을 보정해 반영합니다."}</li>
          </ul>
        </section>

        <section className="guide-section">
          <h3 style={{ fontSize: '18px', color: '#43483f' }}>{isEnglish ? "3. Source information" : "3. 자료출처 안내"}</h3>
          <ul style={{ lineHeight: '1.8' }}>
            <li>{isEnglish ? "Raw files, sources, data levels, and reference dates are available in this guide." : "각 지표의 원천 파일, 자료출처, 데이터레벨, 자료 시점은 상단 지표 설명 표에서 확인할 수 있습니다."}</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function Contact({ isEnglish }) {
  const [sent, setSent] = useState(false);
  return (
    <div className="contact-page">
      <h1>{isEnglish ? "Contact" : "문의하기"}</h1>
      <p>{isEnglish ? "Send your inquiry to the project team." : "서비스 관련 문의는 프로젝트 팀에 전달해 주세요."}</p>
      <input placeholder={isEnglish ? "Name" : "이름"} />
      <input placeholder={isEnglish ? "Email" : "이메일"} />
      <textarea placeholder={isEnglish ? "Message" : "문의 내용"} />
      <button onClick={() => setSent(true)}>{isEnglish ? "Send" : "보내기"}</button>
      {sent && <p className="sent-message">{isEnglish ? "Your inquiry is marked as received." : "문의가 접수된 것으로 표시됩니다."}</p>}
    </div>
  );
}

export default App;