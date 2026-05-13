import { CATEGORY_SHORT } from '../../constants/categories';
import { t } from '../../utils/i18n';

export function ResultCard({ item, onOpen, language }) {
  const circumference = 2 * Math.PI * 34;
  const progress = Math.max(0, Math.min(100, item.finalScore));
  const dash = circumference - (progress / 100) * circumference;

  return (
    <article className="result-card result-card-reference">
      <div className="rank-badge">#{item.rank}</div>
      <button className="result-main" onClick={onOpen}>
        <div className="score-donut" aria-label={`${t('finalScore', language)} ${item.finalScore}`}>
          <svg viewBox="0 0 84 84" role="img">
            <circle cx="42" cy="42" r="34" className="donut-bg" />
            <circle cx="42" cy="42" r="34" className="donut-fg" style={{ strokeDasharray: circumference, strokeDashoffset: dash }} />
          </svg>
          <strong>{item.finalScore}</strong>
        </div>
        <div className="result-copy">
          <h3>{language === 'en' ? item.regionNameEn : item.regionNameKo}</h3>
          <p>{item.parentRegionNameKo}</p>
        </div>
      </button>

      <div className="category-badges compact">
        {Object.entries(item.categoryScores || {}).map(([key, value]) => (
          <span key={key}>
            {language === 'en' ? CATEGORY_SHORT[key]?.en : CATEGORY_SHORT[key]?.ko} {Math.round(value)}
          </span>
        ))}
      </div>

      <ul className="reason-list compact">
        {(item.reasons || []).slice(0, 2).map(reason => <li key={reason}>{reason}</li>)}
      </ul>

      <div className="spot-list-mini compact">
        {(item.touristSpots || []).slice(0, 3).map(spot => <span key={spot.name}>{spot.name}</span>)}
      </div>
    </article>
  );
}
