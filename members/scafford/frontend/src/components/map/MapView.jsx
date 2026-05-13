import { useMemo, useState } from 'react';
import { CATEGORIES } from '../../constants/categories';
import { getScoreLabel } from '../../utils/scoreLabel';
import { resolveLabelOffset, resolveMapPosition } from '../../utils/mapProjection';

const MIN_ZOOM = 1;
const MAX_ZOOM = 1.55;
const ZOOM_STEP = 0.14;

const VECTOR_REGIONS = [
  { id: 'gyeonggi', label: '경기도', x: 410, y: 225, d: 'M280 185 L360 125 L470 135 L545 205 L520 300 L430 350 L315 320 L255 250 Z' },
  { id: 'seoul', label: '서울특별시', x: 420, y: 177, d: 'M386 160 L438 148 L465 178 L438 208 L388 200 Z' },
  { id: 'incheon', label: '인천광역시', x: 270, y: 233, d: 'M220 212 L272 185 L315 218 L292 285 L230 290 Z' },
  { id: 'gangwon', label: '강원도', x: 650, y: 165, d: 'M520 80 L700 55 L875 130 L925 245 L835 335 L660 330 L520 260 Z' },
  { id: 'chungbuk', label: '충청북도', x: 540, y: 360, d: 'M455 305 L600 290 L690 360 L645 470 L500 455 L430 370 Z' },
  { id: 'chungnam', label: '충청남도', x: 345, y: 410, d: 'M240 335 L405 330 L485 425 L405 520 L260 510 L185 420 Z' },
  { id: 'sejong', label: '세종특별자치시', x: 430, y: 357, d: 'M405 342 L440 330 L462 358 L440 386 L405 376 Z' },
  { id: 'daejeon', label: '대전광역시', x: 445, y: 445, d: 'M415 420 L455 405 L488 438 L466 480 L420 470 Z' },
  { id: 'gyeongbuk', label: '경상북도', x: 755, y: 445, d: 'M640 330 L840 325 L965 455 L890 620 L705 600 L625 470 Z' },
  { id: 'daegu', label: '대구광역시', x: 735, y: 550, d: 'M700 525 L750 508 L790 545 L760 590 L705 580 Z' },
  { id: 'jeonbuk', label: '전라북도', x: 385, y: 575, d: 'M255 515 L430 510 L550 605 L465 720 L300 700 L215 600 Z' },
  { id: 'gwangju', label: '광주광역시', x: 315, y: 735, d: 'M280 708 L330 690 L370 725 L342 772 L288 762 Z' },
  { id: 'jeonnam', label: '전라남도', x: 330, y: 825, d: 'M180 700 L355 695 L500 795 L450 950 L250 975 L115 850 Z' },
  { id: 'gyeongnam', label: '경상남도', x: 660, y: 720, d: 'M505 650 L710 620 L865 700 L815 850 L620 870 L470 780 Z' },
  { id: 'ulsan', label: '울산광역시', x: 895, y: 675, d: 'M835 630 L910 610 L955 670 L925 730 L850 715 Z' },
  { id: 'busan', label: '부산광역시', x: 820, y: 825, d: 'M760 780 L840 765 L900 825 L865 895 L775 870 Z' },
  { id: 'jeju', label: '제주특별자치도', x: 250, y: 1100, d: 'M105 1075 C180 1035 310 1030 405 1075 C430 1105 385 1145 285 1160 C190 1174 100 1140 82 1110 C70 1093 78 1085 105 1075 Z' }
];

function KoreaVectorMap({ language }) {
  return (
    <svg
      className="korea-vector-map"
      viewBox="0 0 1216 1260"
      role="img"
      aria-label={language === 'en' ? 'vector map of South Korea' : '대한민국 벡터 그래픽 지도'}
    >
      <defs>
        <linearGradient id="regionFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef1ef" />
        </linearGradient>
        <filter id="softRegionShadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="16" stdDeviation="10" floodColor="#9aa2a9" floodOpacity="0.28" />
        </filter>
        <filter id="innerLift" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="-3" dy="-3" stdDeviation="2" floodColor="#ffffff" floodOpacity="0.9" />
          <feDropShadow dx="5" dy="8" stdDeviation="5" floodColor="#b3bac1" floodOpacity="0.28" />
        </filter>
      </defs>

      <g className="vector-map-ground">
        <ellipse cx="600" cy="690" rx="455" ry="405" />
        <ellipse cx="270" cy="1120" rx="210" ry="70" />
      </g>

      <g className="vector-region-group" filter="url(#softRegionShadow)">
        {VECTOR_REGIONS.map(region => (
          <g key={region.id} className={`vector-region-node vector-region-${region.id}`}>
            <path className="vector-region-extrude" d={region.d} transform="translate(0 18)" />
            <path className="vector-region" d={region.d} filter="url(#innerLift)" />
          </g>
        ))}
      </g>

      <g className="vector-labels">
        {VECTOR_REGIONS.map(region => (
          <text key={region.id} x={region.x} y={region.y}>
            {region.label}
          </text>
        ))}
        <text x="1040" y="230">울릉도</text>
        <text x="1125" y="350">독도</text>
      </g>

      <g className="vector-islands">
        <circle cx="1040" cy="285" r="18" />
        <circle cx="1120" cy="420" r="8" />
        <circle cx="1140" cy="435" r="5" />
      </g>
    </svg>
  );
}

export function MapView({ recommendations, scores, heatmapCategory, setHeatmapCategory, selectedRegionId, onSelectRegion, language }) {
  const [zoom, setZoom] = useState(1);
  const topIds = new Set(recommendations.map(item => item.region_id));

  const markerItems = useMemo(() => {
    if (recommendations.length) return recommendations;
    return scores.slice(0, 5).map((item, idx) => ({
      rank: idx + 1,
      region_id: item.region_id,
      regionNameKo: item.region_name_ko,
      regionNameEn: item.region_name_en,
      latitude: item.latitude,
      longitude: item.longitude,
      mapX: item.mapX,
      mapY: item.mapY,
      categoryScores: item.categoryScores,
      finalScore: item.categoryScores?.[heatmapCategory] || 0
    }));
  }, [recommendations, scores, heatmapCategory]);

  function zoomIn() {
    setZoom(value => Math.min(MAX_ZOOM, +(value + ZOOM_STEP).toFixed(2)));
  }

  function zoomOut() {
    setZoom(value => Math.max(MIN_ZOOM, +(value - ZOOM_STEP).toFixed(2)));
  }

  function displayName(item) {
    if (language === 'en') return item.regionNameEn || item.region_name_en || item.regionNameKo || item.region_name_ko;
    return item.regionNameKo || item.region_name_ko;
  }

  function markerScore(item) {
    return Math.round(item.finalScore ?? item.categoryScores?.[heatmapCategory] ?? 0);
  }

  return (
    <section className="map-panel" aria-label="가중치 기반 추천 지도">
      <div className="map-toolbar map-toolbar-enhanced">
        <div className="map-title-group">
          <h2>{language === 'en' ? 'Weighted recommendation map' : '가중치 기반 추천 지도'}</h2>
        </div>

        <div className="map-toolbar-right">
          <div className="heatmap-tabs" role="group" aria-label="히트맵 카테고리 선택">
            {CATEGORIES.map(category => (
              <button
                key={category.key}
                className={heatmapCategory === category.key ? 'active' : ''}
                onClick={() => setHeatmapCategory(category.key)}
                title={`${language === 'en' ? category.en : category.ko} 히트맵`}
              >
                {language === 'en' ? category.en : category.ko}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="korea-map-card vector-map-card">
        <div className="map-zoom-controls" role="group" aria-label="지도 확대 축소">
          <button type="button" onClick={zoomIn} disabled={zoom >= MAX_ZOOM} aria-label="지도 확대">
            +
          </button>
          <button type="button" onClick={zoomOut} disabled={zoom <= MIN_ZOOM} aria-label="지도 축소">
            −
          </button>
        </div>

        <div className="map-stage vector-map-stage" style={{ transform: `scale(${zoom})` }}>
          <KoreaVectorMap language={language} />

          {scores.map(score => {
            const value = score.categoryScores?.[heatmapCategory] ?? 0;
            const label = getScoreLabel(value);
            const isRecommended = topIds.has(score.region_id);
            const point = resolveMapPosition(score);
            return (
              <span
                key={`heat-${score.region_id}`}
                className={`heat-dot ${isRecommended ? 'in-top' : ''}`}
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  background: `radial-gradient(circle, ${label.color} 0%, rgba(255,255,255,0) 72%)`,
                  opacity: isRecommended ? 0.32 : 0.16,
                  transform: `translate(-50%, -50%) scale(${isRecommended ? 1.35 : 1})`
                }}
                aria-hidden="true"
              />
            );
          })}

          {markerItems.map((item, index) => {
            const isSelected = selectedRegionId === item.region_id;
            const value = markerScore(item);
            const point = resolveMapPosition(item);
            const offset = resolveLabelOffset(item, index);
            const name = displayName(item);
            return (
              <button
                key={item.region_id}
                className={`map-marker marker-reference ${isSelected ? 'selected' : ''}`}
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  '--label-x': `${offset.dx}px`,
                  '--label-y': `${offset.dy}px`
                }}
                onClick={() => onSelectRegion(item.region_id)}
                aria-label={`추천 ${item.rank}위 ${name}`}
              >
                <span className="marker-pin marker-pin-reference" aria-hidden="true">#{item.rank}</span>
                <span className={`marker-callout marker-callout-reference ${offset.align === 'right' ? 'align-right' : ''}`}>
                  <span className="marker-title-line">
                    <span className="marker-label">{name}</span>
                  </span>
                  <span className="marker-score">{value}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
