import { CATEGORIES } from '../../constants/categories';

export function RadarChart({ scores = {}, language }) {
  const size = 260;
  const center = size / 2;
  const maxRadius = 92;
  const points = CATEGORIES.map((category, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / CATEGORIES.length;
    const value = Number(scores[category.key] || 0);
    const radius = (value / 100) * maxRadius;
    return {
      category,
      value,
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * (maxRadius + 28),
      labelY: center + Math.sin(angle) * (maxRadius + 28),
      axisX: center + Math.cos(angle) * maxRadius,
      axisY: center + Math.sin(angle) * maxRadius
    };
  });
  const polygon = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg className="radar-chart" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="5대 카테고리 방사형 차트">
      {[0.25, 0.5, 0.75, 1].map(level => (
        <polygon
          key={level}
          points={CATEGORIES.map((_, index) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 * index) / CATEGORIES.length;
            return `${center + Math.cos(angle) * maxRadius * level},${center + Math.sin(angle) * maxRadius * level}`;
          }).join(' ')}
          className="radar-grid"
        />
      ))}
      {points.map(point => (
        <line key={point.category.key} x1={center} y1={center} x2={point.axisX} y2={point.axisY} className="radar-axis" />
      ))}
      <polygon points={polygon} className="radar-area" />
      {points.map(point => (
        <g key={point.category.key}>
          <circle cx={point.x} cy={point.y} r="4" className="radar-point" />
          <text x={point.labelX} y={point.labelY} textAnchor="middle" dominantBaseline="middle" className="radar-label">
            {language === 'en' ? point.category.en : point.category.ko}
          </text>
          <text x={point.labelX} y={point.labelY + 15} textAnchor="middle" dominantBaseline="middle" className="radar-value">
            {Math.round(point.value)}
          </text>
        </g>
      ))}
    </svg>
  );
}
