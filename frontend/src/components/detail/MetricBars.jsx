import { getScoreLabel } from '../../utils/scoreLabel';

export function MetricBars({ metrics, language }) {
  return (
    <div className="metric-bars">
      {metrics.map(metric => {
        const label = getScoreLabel(metric.score_100);
        return (
          <article className="metric-row" key={metric.metric_id}>
            <div className="metric-topline">
              <strong>{language === 'en' ? metric.metric_name_en : metric.metric_name_ko}</strong>
              <span>{language === 'en' ? label.labelEn : label.label} · {Number(metric.score_100).toFixed(1)}</span>
            </div>
            <div className="metric-track" aria-hidden="true">
              <i style={{ width: `${metric.score_100}%`, backgroundColor: label.color }} />
            </div>
            <div className="metric-meta">
              <span>{language === 'en' ? 'Raw value' : '실제값'}: {metric.raw_value} {metric.unit}</span>
              <span>{metric.source} · {metric.year}</span>
            </div>
            <p>{label.desc}</p>
          </article>
        );
      })}
    </div>
  );
}
