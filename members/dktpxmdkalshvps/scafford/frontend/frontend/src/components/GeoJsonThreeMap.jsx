import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

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

const TOP_COLORS = ["#2f6f44", "#3f8f57", "#56a96b", "#74bd83", "#95cea1"];

function str(value) {
  return String(value ?? "");
}

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

  if (!pts.length) {
    return { minX: 124, maxX: 132, minY: 33, maxY: 39 };
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  pts.forEach(([x, y]) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
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
    const x = Number(lon);
    const y = Number(lat);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    // x: east-west, y: north-south. Keep north upward in local XY plane.
    return new THREE.Vector2((x - cx) * scale, (y - cy) * scale);
  };
}

function signedArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
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

  if (points.length > 2 && points[0].distanceTo(points[points.length - 1]) < 0.00001) {
    points.pop();
  }

  if (points.length < 3) return [];

  // THREE.Shape is more stable with counter-clockwise outer rings.
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

  if (geometry.type === "Polygon") {
    return polygonToShapes(geometry.coordinates, project);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((polygon) => polygonToShapes(polygon, project));
  }

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

function CameraSetup() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, -82, 90);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);
    camera.zoom = 5.85;
    camera.near = 0.1;
    camera.far = 1000;
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

function RegionMesh({ feature, project, region, rank, selected, hovered, onHover, onSelect }) {
  const ref = useRef(null);
  const code = featureCode(feature);

  const geometry = useMemo(() => {
    const shapes = featureToShapes(feature, project);
    if (!shapes.length) return null;

    try {
      const geom = new THREE.ExtrudeGeometry(shapes, {
        depth: region ? 2.8 : 1.7,
        bevelEnabled: true,
        bevelThickness: 0.18,
        bevelSize: 0.12,
        bevelSegments: 1,
        steps: 1,
        curveSegments: 1
      });
      geom.computeVertexNormals();
      geom.computeBoundingSphere();
      return geom;
    } catch (error) {
      console.warn("ExtrudeGeometry failed:", code, featureName(feature), error);
      return null;
    }
  }, [feature, project, region, code]);

  useFrame(() => {
    if (!ref.current) return;
    const target = hovered ? 4.2 : selected ? 3.0 : region ? 1.25 : 0;
    ref.current.position.z += (target - ref.current.position.z) * 0.16;
  });

  if (!geometry) return null;

  const color = hovered
    ? "#295f38"
    : selected
      ? "#2fb35c"
      : region
        ? TOP_COLORS[Math.min(Math.max((rank || 1) - 1, 0), TOP_COLORS.length - 1)]
        : "#dde6e2";

  return (
    <mesh
      ref={ref}
      geometry={geometry}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover({ feature, region, rank });
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onHover(null);
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (region) onSelect?.(region);
      }}
    >
      <meshStandardMaterial
        color={color}
        side={THREE.DoubleSide}
        roughness={0.7}
        metalness={0.02}
      />
    </mesh>
  );
}

function Outline({ feature, project }) {
  const lines = useMemo(() => {
    const geom = feature?.geometry;
    const polygons = geom?.type === "MultiPolygon"
      ? geom.coordinates
      : geom?.type === "Polygon"
        ? [geom.coordinates]
        : [];

    return polygons
      .map((polygon) => ringToPoints(polygon?.[0], project))
      .filter((points) => points.length >= 3)
      .map((points) => {
        const closed = [...points, points[0]];
        return new THREE.BufferGeometry().setFromPoints(
          closed.map((p) => new THREE.Vector3(p.x, p.y, 2.95))
        );
      });
  }, [feature, project]);

  return (
    <>
      {lines.map((geometry, index) => (
        <line key={index} geometry={geometry}>
          <lineBasicMaterial color="#cfd7d8" transparent opacity={0.55} />
        </line>
      ))}
    </>
  );
}

function KoreaScene({ geojson, rankings, selectedRegionId, onSelectRegion, setHoveredInfo }) {
  const [hoveredCode, setHoveredCode] = useState("");
  const bounds = useMemo(() => boundsOfGeoJson(geojson), [geojson]);
  const project = useMemo(() => createProjector(bounds), [bounds]);
  const features = geojson?.features || [];

  const matches = useMemo(() => {
    const map = new Map();
    features.forEach((feature) => {
      const region = matchRegion(feature, rankings);
      if (region) map.set(featureCode(feature), region);
    });
    return map;
  }, [features, rankings]);

  function handleHover(info) {
    if (!info) {
      setHoveredCode("");
      setHoveredInfo(null);
      return;
    }

    const code = featureCode(info.feature);
    setHoveredCode(code);
    setHoveredInfo({
      name: featureName(info.feature),
      sido: sidoInfo(code).ko,
      region: info.region,
      rank: info.rank
    });
  }

  return (
    <>
      <CameraSetup />
      <color attach="background" args={["#eef1f1"]} />
      <ambientLight intensity={1.95} />
      <directionalLight position={[35, -48, 92]} intensity={2.45} />
      <directionalLight position={[-36, 42, 46]} intensity={0.95} />

      <group rotation={[-0.42, 0, 0]} position={[-3.2, -1.6, 0]} scale={0.98}>
        <mesh position={[0, 0, -1.8]}>
          <circleGeometry args={[54, 96]} />
          <meshBasicMaterial color="#cfd7d7" transparent opacity={0.32} side={THREE.DoubleSide} />
        </mesh>

        {features.map((feature, index) => {
          const code = featureCode(feature) || `feature-${index}`;
          const region = matches.get(code);
          const selected = Boolean(region && (region.id === selectedRegionId || region.region_id === selectedRegionId));
          const rank = region?.rank || (region ? rankings.findIndex((item) => item === region) + 1 : 0);

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
            />
          );
        })}

        {features.map((feature, index) => (
          <Outline key={`outline-${featureCode(feature) || index}`} feature={feature} project={project} />
        ))}
      </group>
    </>
  );
}

export function GeoJsonThreeMap({ rankings = [], selectedRegionId, isEnglish = false, onSelectRegion, style }) {
  const [geojson, setGeojson] = useState(null);
  const [error, setError] = useState("");
  const [hoveredInfo, setHoveredInfo] = useState(null);

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

    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div className="geojson-map-state">
        <strong>{isEnglish ? "Unable to load 3D map." : "3D 지도를 불러오지 못했습니다."}</strong>
        <span>{error}</span>
      </div>
    );
  }

  if (!geojson) {
    return (
      <div className="geojson-map-state">
        {isEnglish ? "Loading 3D map..." : "3D 시군구 지도를 불러오는 중입니다."}
      </div>
    );
  }

  return (
    <div className="geojson-three-map geojson-three-map-visible" style={style}>
      <Canvas
        orthographic
        camera={{ position: [0, -82, 90], zoom: 5.85, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        <KoreaScene
          geojson={geojson}
          rankings={rankings}
          selectedRegionId={selectedRegionId}
          onSelectRegion={onSelectRegion}
          setHoveredInfo={setHoveredInfo}
        />
      </Canvas>

      {hoveredInfo && (
        <div className="geojson-map-tooltip">
          <strong>{hoveredInfo.name}</strong>
          <span>
            {hoveredInfo.region
              ? `${isEnglish ? "Recommended" : "추천"} ${hoveredInfo.rank ? `#${hoveredInfo.rank}` : ""} · ${Math.round(hoveredInfo.region.finalScore || 0)}`
              : hoveredInfo.sido}
          </span>
        </div>
      )}
    </div>
  );
}
