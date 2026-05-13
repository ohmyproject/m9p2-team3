import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

const SIDO_PREFIX = {
  "11": { ko: "서울특별시", short: "서울" },
  "26": { ko: "부산광역시", short: "부산" },
  "27": { ko: "대구광역시", short: "대구" },
  "28": { ko: "인천광역시", short: "인천" },
  "29": { ko: "광주광역시", short: "광주" },
  "30": { ko: "대전광역시", short: "대전" },
  "31": { ko: "울산광역시", short: "울산" },
  "36": { ko: "세종특별자치시", short: "세종" },
  "41": { ko: "경기도", short: "경기" },
  "42": { ko: "강원특별자치도", short: "강원" },
  "43": { ko: "충청북도", short: "충북" },
  "44": { ko: "충청남도", short: "충남" },
  "45": { ko: "전라북도", short: "전북" },
  "46": { ko: "전라남도", short: "전남" },
  "47": { ko: "경상북도", short: "경북" },
  "48": { ko: "경상남도", short: "경남" },
  "50": { ko: "제주특별자치도", short: "제주" },
  "51": { ko: "강원특별자치도", short: "강원" },
  "52": { ko: "전북특별자치도", short: "전북" },
};

function str(value) {
  return String(value ?? "");
}

function featureCode(feature) {
  return str(feature?.properties?.SIG_CD ?? feature?.properties?.sig_cd ?? feature?.properties?.code ?? feature?.id);
}

function featureName(feature) {
  return str(
    feature?.properties?.SIG_KOR_NM ??
      feature?.properties?.SIG_NM ??
      feature?.properties?.name ??
      feature?.properties?.adm_nm ??
      feature?.properties?.kor_nm ??
      featureCode(feature)
  );
}

// 💡 엉뚱한 지역 매칭 오류(부산->대구 등)를 완벽하게 차단하는 강화된 로직
function matchRegion(feature, rankings = []) {
  const fCode = featureCode(feature);
  const fNameRaw = featureName(feature);
  if (!fNameRaw) return null;

  const sidoInfo = SIDO_PREFIX[str(fCode).slice(0, 2)] || { ko: "", short: "" };
  const sidoKo = sidoInfo.ko;
  const sidoShort = sidoInfo.short;

  const sidoList = [
    "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원특별자치도", "충청북도", "충청남도", "전북특별자치도", "전라북도", "전라남도", "경상북도", "경상남도", "제주특별자치도",
    "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
  ];

  for (const region of rankings) {
    if (region.id && fCode && String(region.id) === String(fCode)) return region;
    if (region.geoCode && fCode && String(region.geoCode) === String(fCode)) return region;

    const rKo = str(region.ko).replace(/\s+/g, "");
    const fName = str(fNameRaw).replace(/\s+/g, "");

    let hasSidoPrefix = false;
    let rSidoMatched = false;

    // 1. 시/도 단위가 일치하는지 먼저 엄격하게 검사
    for (const s of sidoList) {
      if (rKo.startsWith(s)) {
        hasSidoPrefix = true;
        if (s === sidoKo || s === sidoShort || sidoKo.startsWith(s) || sidoShort.startsWith(s)) {
          rSidoMatched = true;
        }
        break;
      }
    }

    // 시/도 이름이 API 데이터에 있는데, 지도의 시/도와 다르면 무조건 스킵 (대구/부산 오작동 완벽 차단)
    if (hasSidoPrefix && !rSidoMatched) continue;

    let localRKo = rKo;
    let localFName = fName;

    // 2. 시/도 이름을 제거하고 순수 지역명(예: 해운대구, 수원시)만 추출
    for (const s of sidoList) {
      if (localRKo.startsWith(s)) { localRKo = localRKo.replace(s, ""); break; }
    }
    for (const s of sidoList) {
      if (localFName.startsWith(s)) { localFName = localFName.replace(s, ""); break; }
    }

    // 3. 지역명 매칭 (수원시 장안구 등 완벽 호환)
    if (localRKo === localFName) return region;
    if (localRKo && localFName.startsWith(localRKo)) return region;
    if (localRKo && localFName.includes(localRKo)) return region;
  }
  return null;
}

function allCoordinates(geometry, output = []) {
  if (!geometry?.coordinates) return output;
  function walk(node) {
    if (!Array.isArray(node)) return;
    if (typeof node[0] === "number" && typeof node[1] === "number") {
      const lon = Number(node[0]);
      const lat = Number(node[1]);
      if (Number.isFinite(lon) && Number.isFinite(lat)) output.push([lon, lat]);
      return;
    }
    node.forEach(walk);
  }
  walk(geometry.coordinates);
  return output;
}

function boundsOfGeoJson(geojson) {
  const pts = [];
  (geojson?.features || []).forEach((feature) => allCoordinates(feature.geometry, pts));
  const initialPts = pts.filter(([lon, lat]) => lon <= 130.35 && lat >= 32.8 && lat <= 39.5);
  const target = initialPts.length ? initialPts : pts;

  if (!target.length) return { minX: 124.5, maxX: 130.2, minY: 33, maxY: 39 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  target.forEach(([x, y]) => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  });
  const padX = (maxX - minX) * 0.06, padY = (maxY - minY) * 0.08;
  return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
}

function createProjector(bounds) {
  const width = 1000, height = 1000;
  const w = bounds.maxX - bounds.minX || 1, h = bounds.maxY - bounds.minY || 1;
  const scale = Math.min(width / w, height / h);
  const offsetX = (width - w * scale) / 2, offsetY = (height - h * scale) / 2;

  return ([lon, lat]) => {
    const x = (Number(lon) - bounds.minX) * scale + offsetX;
    const y = height - ((Number(lat) - bounds.minY) * scale + offsetY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return [x, y];
  };
}

function ringToPath(ring, project) {
  const points = [];
  for (const coord of ring || []) {
    const projected = project(coord);
    if (!projected) continue;
    const previous = points[points.length - 1];
    if (!previous || Math.abs(previous[0] - projected[0]) > 0.01 || Math.abs(previous[1] - projected[1]) > 0.01) {
      points.push(projected);
    }
  }
  if (points.length < 3) return "";
  return `${points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ")} Z`;
}

function featureToPath(feature, project) {
  const geometry = feature?.geometry;
  if (!geometry) return "";
  const polygons = geometry.type === "MultiPolygon" ? geometry.coordinates : geometry.type === "Polygon" ? [geometry.coordinates] : [];
  return polygons.map((polygon) => ringToPath(polygon?.[0], project)).filter(Boolean).join(" ");
}

export function GeoJsonThreeMap({ rankings = [], selectedRegionId, isEnglish = false, onSelectRegion, style }) {
  const [geojson, setGeojson] = useState(null);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch("/data/sigungu_20230729_simple.geojson")
      .then((response) => {
        if (!response.ok) throw new Error(`GeoJSON ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (alive) setGeojson(data);
      })
      .catch((err) => {
        console.error("시군구 GeoJSON 로딩 실패:", err);
        if (alive) setError(err.message || "GeoJSON 로딩 실패");
      });
    return () => { alive = false; };
  }, []);

  const { features, project, matches } = useMemo(() => {
    const list = geojson?.features || [];
    const bounds = boundsOfGeoJson(geojson);
    const projectFn = createProjector(bounds);
    const matchMap = new Map();

    list.forEach((feature) => {
      const region = matchRegion(feature, rankings);
      if (region) matchMap.set(featureCode(feature), region);
    });

    return { features: list, project: projectFn, matches: matchMap };
  }, [geojson, rankings]);

  if (error) {
    return (
      <div className="geojson-map-state">
        <strong>{isEnglish ? "Unable to load map." : "지도를 불러오지 못했습니다."}</strong>
        <span>{error}</span>
      </div>
    );
  }

  if (!geojson) {
    return <div className="geojson-map-state">{isEnglish ? "Loading map..." : "지도를 불러오는 중입니다."}</div>;
  }

  return (
    <div className="geojson-two-map" style={style}>
      <style>{`
        .geo-region-default { fill: #eef2f6 !important; stroke: #cbd5e1 !important; transition: fill 0.2s ease; }
        .geo-region-default:hover { fill: #cbd5e1 !important; }
        .geo-region-filled.rank-1 { fill: #15803d !important; stroke: #14532d !important; opacity: 1 !important; }
        .geo-region-filled.rank-2 { fill: #16a34a !important; stroke: #14532d !important; opacity: 1 !important; }
        .geo-region-filled.rank-3 { fill: #22c55e !important; stroke: #14532d !important; opacity: 1 !important; }
        .geo-region-filled.rank-4 { fill: #4ade80 !important; stroke: #14532d !important; opacity: 1 !important; }
        .geo-region-filled.rank-5 { fill: #86efac !important; stroke: #14532d !important; opacity: 1 !important; }
      `}</style>

      {/* 마커(Circle) 요소를 완전히 삭제하여 오직 색상만으로 표시되게 변경했습니다 */}
      <svg className="geojson-two-map-svg" viewBox="70 20 860 900" role="img" aria-label="추천 지도">
        <g className="geojson-two-map-layer">
          {features.map((feature, index) => {
            const code = featureCode(feature) || `feature-${index}`;
            const region = matches.get(code);
            const rank = region ? rankings.findIndex((item) => item.id === region.id) + 1 : 0;
            const selected = Boolean(region && (region.id === selectedRegionId || region.region_id === selectedRegionId));
            const path = featureToPath(feature, project);
            if (!path) return null;

            const fillClass = region ? `geo-region-filled rank-${rank}` : "geo-region-default";

            return (
              <path
                key={code}
                className={`geo-region ${fillClass} ${selected ? "is-selected" : ""}`}
                d={path}
                onMouseEnter={(event) => {
                  setHovered({
                    x: event.clientX, y: event.clientY, name: featureName(feature), sido: SIDO_PREFIX[str(code).slice(0, 2)]?.ko || "", region, rank,
                  });
                }}
                onMouseMove={(event) => setHovered((prev) => prev ? { ...prev, x: event.clientX, y: event.clientY } : prev)}
                onMouseLeave={() => setHovered(null)}
                onClick={(event) => {
                  event.stopPropagation();
                  if (region) onSelectRegion?.(region);
                }}
              />
            );
          })}
        </g>
      </svg>

      {hovered && typeof window !== "undefined" && createPortal(
        <div
          className="geojson-hover-card"
          style={{ position: "fixed", left: hovered.x + 14, top: hovered.y + 14, zIndex: 999999 }}
        >
          <strong>{hovered.region ? (isEnglish ? hovered.region.en : hovered.region.ko) : hovered.name}</strong>
          <span>
            {hovered.region
              ? `${isEnglish ? "Recommended" : "추천"} #${hovered.rank || "-"} · ${Math.round(hovered.region.finalScore || 0)}점`
              : hovered.sido}
          </span>
        </div>,
        document.body
      )}
    </div>
  );
}