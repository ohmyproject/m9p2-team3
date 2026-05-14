import { Canvas, useFrame, useThree } from "@react-three/fiber";
<<<<<<<< Updated upstream:members/kyoungseok-Oh/scafford/frontend/frontend/src_backup/components/GeoJsonThreeMap.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
========
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
>>>>>>>> Stashed changes:members/dktpxmdkalshvps/scafford/frontend/src/components/GeoJsonThreeMap.jsx
import * as THREE from "three";

const TILT_RAD = -(10 * Math.PI / 180);
const GRP_POS = [-3.2, -1.6, 0];
const GRP_SCALE = 0.98;

const SIDO_PREFIX = {
  "11": { ko: "서울특별시", id: "seoul" },
  "26": { ko: "부산광역시", id: "busan" },
  "27": { ko: "대구광역시", id: "daegu" },
  "28": { ko: "인천광역시", id: "incheon" },
  "29": { ko: "광주광역시", id: "gwangju" },
  "30": { ko: "대전광역시", id: "daejeon" },
  "31": { ko: "울산광역시", id: "ulsan" },
  "36": { ko: "세종특별자치시", id: "sejong" },
  "41": { ko: "경기도", id: "gyeonggi" },
  "42": { ko: "강원특별자치도", id: "gangwon" },
  "43": { ko: "충청북도", id: "chungbuk" },
  "44": { ko: "충청남도", id: "chungnam" },
  "45": { ko: "전라북도", id: "jeonbuk" },
  "46": { ko: "전라남도", id: "jeonnam" },
  "47": { ko: "경상북도", id: "gyeongbuk" },
  "48": { ko: "경상남도", id: "gyeongnam" },
  "50": { ko: "제주특별자치도", id: "jeju" },
  "51": { ko: "강원특별자치도", id: "gangwon" },
  "52": { ko: "전북특별자치도", id: "jeonbuk" }
};

// 히트맵 색상 정의: 낮음(파랑) -> 높음(빨강)
const HEATMAP_COLORS = {
  0: "#e3f2fd",     // 매우 낮음 - 밝은 파랑
  1: "#bbdefb",     // 낮음
  2: "#90caf9",
  3: "#64b5f6",
  4: "#42a5f5",
  5: "#2196f3",     // 중간 - 파랑
  6: "#1e88e5",
  7: "#1976d2",
  8: "#1565c0",
  9: "#0d47a1",     // 높음 - 진한 파랑
  10: "#ff6f00"     // 매우 높음 - 주황색
};

function str(value) { return String(value ?? ""); }

function featureCode(feature) {
  return str(feature?.properties?.SIG_CD ?? feature?.properties?.sig_cd ?? feature?.properties?.code);
}

function featureName(feature) {
  return str(feature?.properties?.SIG_KOR_NM ?? feature?.properties?.SIG_NM ?? feature?.properties?.name ?? featureCode(feature));
}

function normalize(value) {
  return str(value)
    .replace(/특별자치도|특별자치시|특별시|광역시|자치구|시|군|구|\s|-/g, "")
    .toLowerCase();
}

function regionCode(region) {
  return str(region?.geo_code ?? region?.geoCode ?? region?.sig_cd ?? region?.SIG_CD ?? region?.region_code ?? region?.code);
}

function regionName(region) {
  return str(region?.ko ?? region?.regionNameKo ?? region?.region_name_ko ?? region?.name ?? region?.label ?? region?.en);
}

function sidoInfo(code) {
  return SIDO_PREFIX[str(code).slice(0, 2)] || { ko: "", id: "" };
}

function allCoordinates(geometry, output = []) {
  if (!geometry?.coordinates) return output;
  function walk(node) {
    if (!Array.isArray(node)) return;
    if (typeof node[0] === "number" && typeof node[1] === "number") {
      output.push([Number(node[0]), Number(node[1])]);
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
  if (!pts.length) return { minX: 124, maxX: 132, minY: 33, maxY: 39 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  pts.forEach(([x, y]) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  });
  return { minX, maxX, minY, maxY };
}

function createProjector(bounds) {
  const w = bounds.maxX - bounds.minX || 1;
  const h = bounds.maxY - bounds.minY || 1;
  const scale = 68 / Math.max(w, h);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  return ([lon, lat]) => {
    const x = Number(lon), y = Number(lat);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return new THREE.Vector2((x - cx) * scale, (y - cy) * scale);
  };
}

function signedArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

function ringToPoints(ring, project) {
  const points = [];
  for (const coord of ring || []) {
    const point = project(coord);
    if (!point) continue;
    const prev = points[points.length - 1];
    if (!prev || prev.distanceTo(point) > 0.00001) points.push(point);
  }
  if (points.length > 2 && points[0].distanceTo(points[points.length - 1]) < 0.00001) points.pop();
  if (points.length < 3) return [];
<<<<<<<< Updated upstream:members/kyoungseok-Oh/scafford/frontend/frontend/src_backup/components/GeoJsonThreeMap.jsx

========
>>>>>>>> Stashed changes:members/dktpxmdkalshvps/scafford/frontend/src/components/GeoJsonThreeMap.jsx
  if (signedArea(points) < 0) points.reverse();
  return points;
}

function polygonToShapes(polygon, project) {
  if (!Array.isArray(polygon) || !polygon.length) return [];
  const outer = ringToPoints(polygon[0], project);
  if (outer.length < 3) return [];
  return [new THREE.Shape(outer)];
}

function featureToShapes(feature, project) {
  const geometry = feature?.geometry;
  if (!geometry) return [];
  if (geometry.type === "Polygon") return polygonToShapes(geometry.coordinates, project);
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flatMap((p) => polygonToShapes(p, project));
  return [];
}

function matchRegion(feature, rankings = []) {
  const code = featureCode(feature);
  const sido = sidoInfo(code);
  const fName = normalize(featureName(feature));
  const sName = normalize(sido.ko);
  return rankings.find((region) => {
    const gCode = regionCode(region);
    if (gCode && gCode === code) return true;
    const rId = normalize(region?.id || region?.region_id || "");
    const rName = normalize(`${regionName(region)} ${region?.parentRegionNameKo || ""}`);
    if (sido.id && rId === sido.id) return true;
    if (sName && rName.includes(sName)) return true;
    if (fName && rName.includes(fName)) return true;
    return false;
  });
}

// 스코어를 0-10 범위로 정규화
function scoreToHeatmapIndex(score, minScore = 0, maxScore = 100) {
  const normalized = (score - minScore) / (maxScore - minScore);
  const clipped = Math.max(0, Math.min(1, normalized));
  return Math.round(clipped * 10);
}

// 히트맵 색상 반환
function getHeatmapColor(score, minScore = 0, maxScore = 100) {
  const index = scoreToHeatmapIndex(score, minScore, maxScore);
  return HEATMAP_COLORS[index];
}

function CameraSetup({ useHeatmap = false }) {
  const { camera } = useThree();
  useEffect(() => {
    if (useHeatmap) {
      // 정면 카메라: 2D 평면 맵처럼 보임
      camera.position.set(0, 0, 120);
      camera.up.set(0, 1, 0);
      camera.lookAt(0, 0, 0);
      camera.zoom = 6.5;  // 4.5 → 6.5 (더 크게)
    } else {
      // 더 수직에 가까운 각도: 보기 편한 위치
      camera.position.set(0, -35, 95);  // 0, -82, 90 → 0, -35, 95 (더 위로)
      camera.up.set(0, 0, 1);
      camera.lookAt(0, 0, 0);
      camera.zoom = 7.2;  // 5.85 → 7.2 (더 크게)
    }
    
    camera.near = 0.1;
    camera.far = 1000;
    camera.updateProjectionMatrix();
<<<<<<<< Updated upstream:members/kyoungseok-Oh/scafford/frontend/frontend/src_backup/components/GeoJsonThreeMap.jsx
  }, [camera, useHeatmap]);

  return null;
}

function RegionMesh({ 
  feature, 
  project, 
  region, 
  rank, 
  selected, 
  hovered, 
  onHover, 
  onSelect,
  useHeatmap = false,
  minScore = 0,
  maxScore = 100
}) {
========
  }, [camera]);
  return null;
}

function RegionMesh({ feature, project, region, rank, selected, hovered, onHover, onSelect, onPin }) {
>>>>>>>> Stashed changes:members/dktpxmdkalshvps/scafford/frontend/src/components/GeoJsonThreeMap.jsx
  const ref = useRef(null);
  const code = featureCode(feature);

  const geometry = useMemo(() => {
    const shapes = featureToShapes(feature, project);
    if (!shapes.length) return null;
    try {
      const geom = new THREE.ExtrudeGeometry(shapes, {
        depth: useHeatmap ? 0.5 : (region ? 2.8 : 1.7),
        bevelEnabled: true,
        bevelThickness: 0.12,
        bevelSize: 0.08,
        bevelSegments: 1,
        steps: 1,
        curveSegments: 1
      });
      geom.computeVertexNormals();
      geom.computeBoundingSphere();
      return geom;
    } catch (err) {
      console.warn("ExtrudeGeometry failed:", code, err);
      return null;
    }
  }, [feature, project, region, code, useHeatmap]);

  useFrame(() => {
    if (!ref.current) return;
    const target = hovered ? 3.2 : selected ? 2.5 : 0;
    ref.current.position.z += (target - ref.current.position.z) * 0.18;
  });

  if (!geometry) return null;

  let color;
  if (useHeatmap && region) {
    // 히트맵 모드: 스코어 기반 색상
    color = getHeatmapColor(region.finalScore || 0, minScore, maxScore);
  } else {
    // 기존 모드: 순위 기반 색상
    color = hovered
      ? "#295f38"
      : selected
        ? "#2fb35c"
        : region
          ? ["#2f6f44", "#3f8f57", "#56a96b", "#74bd83", "#95cea1"][Math.min(Math.max((rank || 1) - 1, 0), 4)]
          : "#dde6e2";
  }

  return (
    <mesh
      ref={ref}
      geometry={geometry}
      onPointerOver={(e) => { e.stopPropagation(); onHover({ feature, region, rank }); }}
      onPointerOut={(e) => { e.stopPropagation(); onHover(null); }}
      onClick={(e) => {
        e.stopPropagation();
        onPin?.({ name: featureName(feature), sido: sidoInfo(code).ko, region, rank });
        if (region) onSelect?.(region);
      }}
    >
<<<<<<<< Updated upstream:members/kyoungseok-Oh/scafford/frontend/frontend/src_backup/components/GeoJsonThreeMap.jsx
      <meshStandardMaterial
        color={color}
        side={THREE.DoubleSide}
        roughness={0.7}
        metalness={0.02}
        emissive={hovered ? "#1a5a30" : 0}
      />
========
      <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.7} metalness={0.02} />
>>>>>>>> Stashed changes:members/dktpxmdkalshvps/scafford/frontend/src/components/GeoJsonThreeMap.jsx
    </mesh>
  );
}

function Outline({ feature, project }) {
  const lines = useMemo(() => {
    const geom = feature?.geometry;
    const polygons = geom?.type === "MultiPolygon"
      ? geom.coordinates
      : geom?.type === "Polygon" ? [geom.coordinates] : [];
    return polygons
      .map((polygon) => ringToPoints(polygon?.[0], project))
<<<<<<<< Updated upstream:members/kyoungseok-Oh/scafford/frontend/frontend/src_backup/components/GeoJsonThreeMap.jsx
      .filter((points) => points.length >= 3)
      .map((points) => {
        const closed = [...points, points[0]];
        return new THREE.BufferGeometry().setFromPoints(
          closed.map((p) => new THREE.Vector3(p.x, p.y, 0.55))
        );
========
      .filter((pts) => pts.length >= 3)
      .map((pts) => {
        const closed = [...pts, pts[0]];
        return new THREE.BufferGeometry().setFromPoints(closed.map((p) => new THREE.Vector3(p.x, p.y, 2.95)));
>>>>>>>> Stashed changes:members/dktpxmdkalshvps/scafford/frontend/src/components/GeoJsonThreeMap.jsx
      });
  }, [feature, project]);
  return (
    <>
<<<<<<<< Updated upstream:members/kyoungseok-Oh/scafford/frontend/frontend/src_backup/components/GeoJsonThreeMap.jsx
      {lines.map((geometry, index) => (
        <line key={index} geometry={geometry}>
          <lineBasicMaterial color="#9e9e9e" transparent opacity={0.6} linewidth={1} />
========
      {lines.map((geometry, i) => (
        <line key={i} geometry={geometry}>
          <lineBasicMaterial color="#cfd7d8" transparent opacity={0.55} />
>>>>>>>> Stashed changes:members/dktpxmdkalshvps/scafford/frontend/src/components/GeoJsonThreeMap.jsx
        </line>
      ))}
    </>
  );
}

<<<<<<<< Updated upstream:members/kyoungseok-Oh/scafford/frontend/frontend/src_backup/components/GeoJsonThreeMap.jsx
function KoreaScene({ 
  geojson, 
  rankings, 
  selectedRegionId, 
  onSelectRegion, 
  setHoveredInfo,
  useHeatmap = false,
  minScore = 0,
  maxScore = 100
}) {
========
function MarkerPositions({ features, rankings, project, groupRef, onUpdate }) {
  const { camera, size } = useThree();
  const prevRef = useRef([]);
  const frameRef = useRef(0);

  const centroids = useMemo(() => {
    return rankings.slice(0, 5).map((region, idx) => {
      const matched = features.find((f) => matchRegion(f, [region]));
      if (!matched) return null;
      const pts = allCoordinates(matched.geometry);
      if (!pts.length) return null;
      let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
      for (const [lon, lat] of pts) {
        if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
      }
      const proj = project([(minLon + maxLon) / 2, (minLat + maxLat) / 2]);
      if (!proj) return null;
      return { localX: proj.x, localY: proj.y, region, rank: idx + 1 };
    }).filter(Boolean);
  }, [features, rankings, project]);

  useFrame(() => {
    frameRef.current++;
    if (frameRef.current % 3 !== 0 || !groupRef.current) return;
    const worldMatrix = groupRef.current.matrixWorld;
    const positions = centroids.map(({ localX, localY, region, rank }) => {
      const worldPos = new THREE.Vector3(localX, localY, 4.5).applyMatrix4(worldMatrix);
      const ndc = worldPos.clone().project(camera);
      return {
        x: (ndc.x * 0.5 + 0.5) * size.width,
        y: (-ndc.y * 0.5 + 0.5) * size.height,
        region, rank,
      };
    });
    const prev = prevRef.current;
    const changed = positions.length !== prev.length ||
      positions.some((pos, i) => !prev[i] || Math.abs(pos.x - prev[i].x) > 0.5 || Math.abs(pos.y - prev[i].y) > 0.5);
    if (changed) { prevRef.current = positions; onUpdate(positions); }
  });

  return null;
}

function KoreaScene({ geojson, rankings, selectedRegionId, onSelectRegion, setHoveredInfo, setMarkerPositions, onPin }) {
>>>>>>>> Stashed changes:members/dktpxmdkalshvps/scafford/frontend/src/components/GeoJsonThreeMap.jsx
  const [hoveredCode, setHoveredCode] = useState("");
  const hoverTimerRef = useRef(null);
  const groupRef = useRef(null);
  const bounds = useMemo(() => boundsOfGeoJson(geojson), [geojson]);
  const project = useMemo(() => createProjector(bounds), [bounds]);
  const features = geojson?.features || [];

  const matches = useMemo(() => {
    const map = new Map();
    features.forEach((f) => {
      const region = matchRegion(f, rankings);
      if (region) map.set(featureCode(f), region);
    });
    return map;
  }, [features, rankings]);

<<<<<<<< Updated upstream:members/kyoungseok-Oh/scafford/frontend/frontend/src_backup/components/GeoJsonThreeMap.jsx
  const handleHover = useCallback((info) => {
========
  function handleHover(info) {
    clearTimeout(hoverTimerRef.current);
>>>>>>>> Stashed changes:members/dktpxmdkalshvps/scafford/frontend/src/components/GeoJsonThreeMap.jsx
    if (!info) {
      hoverTimerRef.current = setTimeout(() => { setHoveredCode(""); setHoveredInfo(null); }, 120);
      return;
    }
    const code = featureCode(info.feature);
    setHoveredCode(code);
<<<<<<<< Updated upstream:members/kyoungseok-Oh/scafford/frontend/frontend/src_backup/components/GeoJsonThreeMap.jsx
    setHoveredInfo({
      name: featureName(info.feature),
      sido: sidoInfo(code).ko,
      region: info.region,
      rank: info.rank
    });
  }, [setHoveredInfo]);

  const groupRotation = useHeatmap ? [0, 0, 0] : [-0.42, 0, 0];
  const groupPosition = useHeatmap ? [0, 0, 0] : [-3.2, -1.6, 0];
========
    setHoveredInfo({ name: featureName(info.feature), sido: sidoInfo(code).ko, region: info.region, rank: info.rank });
  }
>>>>>>>> Stashed changes:members/dktpxmdkalshvps/scafford/frontend/src/components/GeoJsonThreeMap.jsx

  useEffect(() => () => clearTimeout(hoverTimerRef.current), []);

  return (
    <>
      <CameraSetup useHeatmap={useHeatmap} />
      <color attach="background" args={["#f5f7fa"]} />
      <ambientLight intensity={useHeatmap ? 1.5 : 1.95} />
      <directionalLight position={[35, -48, 92]} intensity={useHeatmap ? 1.8 : 2.45} />
      <directionalLight position={[-36, 42, 46]} intensity={useHeatmap ? 0.6 : 0.95} />

<<<<<<<< Updated upstream:members/kyoungseok-Oh/scafford/frontend/frontend/src_backup/components/GeoJsonThreeMap.jsx
      <group rotation={groupRotation} position={groupPosition} scale={0.98}>
        {!useHeatmap && (
          <mesh position={[0, 0, -1.8]}>
            <circleGeometry args={[54, 96]} />
            <meshBasicMaterial color="#cfd7d7" transparent opacity={0.32} side={THREE.DoubleSide} />
          </mesh>
        )}
========
      <group ref={groupRef} rotation={[TILT_RAD, 0, 0]} position={GRP_POS} scale={GRP_SCALE}>
        <mesh position={[0, 0, -1.8]}>
          <circleGeometry args={[54, 96]} />
          <meshBasicMaterial color="#cfd7d7" transparent opacity={0.32} side={THREE.DoubleSide} />
        </mesh>
>>>>>>>> Stashed changes:members/dktpxmdkalshvps/scafford/frontend/src/components/GeoJsonThreeMap.jsx

        {features.map((feature, index) => {
          const code = featureCode(feature) || `feature-${index}`;
          const region = matches.get(code);
          const selected = Boolean(region && (region.id === selectedRegionId || region.region_id === selectedRegionId));
          const rank = region?.rank || (region ? rankings.findIndex((r) => r === region) + 1 : 0);
          return (
            <RegionMesh
              key={code}
              feature={feature}
              project={project}
              region={region}
              rank={rank}
              selected={selected}
              hovered={hoveredCode === code}
              onHover={handleHover}
              onSelect={onSelectRegion}
<<<<<<<< Updated upstream:members/kyoungseok-Oh/scafford/frontend/frontend/src_backup/components/GeoJsonThreeMap.jsx
              useHeatmap={useHeatmap}
              minScore={minScore}
              maxScore={maxScore}
========
              onPin={onPin}
>>>>>>>> Stashed changes:members/dktpxmdkalshvps/scafford/frontend/src/components/GeoJsonThreeMap.jsx
            />
          );
        })}

        {features.map((feature, index) => (
          <Outline key={`outline-${featureCode(feature) || index}`} feature={feature} project={project} />
        ))}
      </group>

      <MarkerPositions
        features={features}
        rankings={rankings}
        project={project}
        groupRef={groupRef}
        onUpdate={setMarkerPositions}
      />
    </>
  );
}

<<<<<<<< Updated upstream:members/kyoungseok-Oh/scafford/frontend/frontend/src_backup/components/GeoJsonThreeMap.jsx
export function GeoJsonThreeMap({ 
  rankings = [], 
  selectedRegionId, 
  isEnglish = false, 
  onSelectRegion, 
  style,
  useHeatmap = false,
  minScore = 0,
  maxScore = 100
}) {
========
export function GeoJsonThreeMap({ rankings = [], selectedRegionId, isEnglish = false, mapZoom = 1, onSelectRegion, style }) {
>>>>>>>> Stashed changes:members/dktpxmdkalshvps/scafford/frontend/src/components/GeoJsonThreeMap.jsx
  const [geojson, setGeojson] = useState(null);
  const [error, setError] = useState("");
  const [hoveredInfo, setHoveredInfo] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [markerPositions, setMarkerPositions] = useState([]);
  const [pinnedInfo, setPinnedInfo] = useState(null);
  const [pinnedPos, setPinnedPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let alive = true;
    fetch("/data/sigungu_20230729_simple.geojson")
      .then((r) => { if (!r.ok) throw new Error(`GeoJSON ${r.status}`); return r.json(); })
      .then((data) => { if (alive) setGeojson(data); })
      .catch((err) => { console.error("시군구 GeoJSON 로딩 실패:", err); if (alive) setError(err.message || "GeoJSON 로딩 실패"); });
    return () => { alive = false; };
  }, []);

  // 스크롤 후 R3F 캔버스 경계 재계산 (scroll bug fix)
  useEffect(() => {
    const onScroll = () => window.dispatchEvent(new Event("resize"));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = containerRef.current.offsetWidth / (rect.width || 1);
    const scaleY = containerRef.current.offsetHeight / (rect.height || 1);
    const pos = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
    mousePosRef.current = pos;
    setMousePos(pos);
  };

  const handlePin = useCallback((info) => {
    setPinnedInfo(info);
    setPinnedPos({ ...mousePosRef.current });
  }, []);

  const clearPin = useCallback(() => setPinnedInfo(null), []);

  if (error) {
    return (
      <div className="geojson-map-state">
        <strong>{isEnglish ? "Unable to load map." : "지도를 불러오지 못했습니다."}</strong>
        <span>{error}</span>
      </div>
    );
  }

  if (!geojson) {
    return (
      <div className="geojson-map-state">
        {isEnglish ? "Loading map..." : "시군구 지도를 불러오는 중입니다."}
      </div>
    );
  }

  const safeZoom = mapZoom || 1;
  const iz = 1 / safeZoom;

  // 호버 or 핀 상태 결정
  const displayInfo = pinnedInfo || hoveredInfo;
  const displayPos = pinnedInfo ? pinnedPos : mousePos;
  const naverSearchName = displayInfo?.region?.ko || displayInfo?.name || "";
  const naverUrl = displayInfo?.region
    ? (displayInfo.region?.naverMap?.webUrl || displayInfo.region?.naverMap?.web_url ||
       `https://map.naver.com/p/search/${encodeURIComponent(naverSearchName)}`)
    : `https://map.naver.com/p/search/${encodeURIComponent(displayInfo?.name || "")}`;

  // 툴팁 위치: 화면에서 고정 오프셋 (18px 오른쪽, 20px 위) 이 되도록 역스케일
  const tooltipLeft = displayPos.x + 18 * iz;
  const tooltipTop = Math.max(8 * iz, displayPos.y - 20 * iz);

  return (
    <div
      ref={containerRef}
      className="geojson-three-map geojson-three-map-visible"
      style={style}
      onMouseMove={handleMouseMove}
    >
      <Canvas
        orthographic
        camera={{ 
          position: useHeatmap ? [0, 0, 120] : [0, -35, 95],  // 더 수직으로
          zoom: useHeatmap ? 6.5 : 7.2,  // 더 크게
          near: 0.1, 
          far: 1000 
        }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
        onPointerMissed={clearPin}
      >
        <KoreaScene
          geojson={geojson}
          rankings={rankings}
          selectedRegionId={selectedRegionId}
          onSelectRegion={onSelectRegion}
          setHoveredInfo={setHoveredInfo}
<<<<<<<< Updated upstream:members/kyoungseok-Oh/scafford/frontend/frontend/src_backup/components/GeoJsonThreeMap.jsx
          useHeatmap={useHeatmap}
          minScore={minScore}
          maxScore={maxScore}
        />
      </Canvas>

      {/* 히트맵 범례 */}
      {useHeatmap && (
        <div className="heatmap-legend">
          <div className="legend-title">{isEnglish ? "Score Range" : "점수 범위"}</div>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: HEATMAP_COLORS[0] }}></div>
              <span>낮음</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: HEATMAP_COLORS[5] }}></div>
              <span>중간</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: HEATMAP_COLORS[10] }}></div>
              <span>높음</span>
            </div>
          </div>
        </div>
      )}

      {hoveredInfo && (
        <div className="geojson-map-tooltip">
          <strong>{hoveredInfo.name}</strong>
          <span>
            {hoveredInfo.region
              ? `${isEnglish ? "Score" : "점수"}: ${Math.round(hoveredInfo.region.finalScore || 0)}`
              : hoveredInfo.sido}
========
          setMarkerPositions={setMarkerPositions}
          onPin={handlePin}
        />
      </Canvas>

      {/* TOP5 마커 (역스케일 적용) */}
      {markerPositions.map(({ x, y, region, rank }) => (
        <div
          key={region.id || rank}
          className={`map-top5-marker map-top5-marker-rank-${rank}`}
          style={{
            left: x,
            top: y,
            transform: `translate(-50%, -100%) scale(${iz})`,
            transformOrigin: "bottom center",
          }}
        >
          <span className="marker-rank-num">{rank}</span>
          <span className="marker-region-name">
            {isEnglish ? region.en : (region.short || region.ko)}
>>>>>>>> Stashed changes:members/dktpxmdkalshvps/scafford/frontend/src/components/GeoJsonThreeMap.jsx
          </span>
        </div>
      ))}

      {/* 호버/핀 미리보기 */}
      {displayInfo && (
        <div
          className={`geojson-map-tooltip${pinnedInfo ? " is-pinned" : ""}`}
          style={{
            left: tooltipLeft,
            top: tooltipTop,
            transform: `scale(${iz})`,
            transformOrigin: "top left",
          }}
        >
          {pinnedInfo && (
            <button className="map-tooltip-close" onClick={clearPin} aria-label="닫기">×</button>
          )}
          <div className="map-tooltip-name">
            {displayInfo.name}
            {displayInfo.sido && displayInfo.sido !== displayInfo.name && (
              <span className="map-tooltip-sido">{displayInfo.sido}</span>
            )}
          </div>

          {displayInfo.region ? (
            <div className="map-tooltip-rank">
              #{displayInfo.rank}&nbsp;{isEnglish ? "Recommended" : "추천"}
              {displayInfo.region.finalScore
                ? ` · ${Math.round(displayInfo.region.finalScore)}pt`
                : ""}
            </div>
          ) : (
            <div className="map-tooltip-area-label">
              {displayInfo.sido || (isEnglish ? "Region" : "지역")}
            </div>
          )}

          <a
            className="map-tooltip-naver-btn"
            href={naverUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z" />
            </svg>
            {isEnglish ? "Open Naver Map" : "네이버지도 바로가기"}
          </a>
        </div>
      )}
    </div>
  );
}
