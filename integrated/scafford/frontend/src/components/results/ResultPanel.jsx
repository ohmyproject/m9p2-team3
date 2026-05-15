import { ResultCard } from './ResultCard.jsx';
import { t } from '../../utils/i18n';

export function ResultPanel({ recommendations, isLoading, error, onRetry, onOpenRegion, onShare, language }) {
  return (
    <aside className="panel result-panel" aria-label="추천 결과 Top 5">
      <div className="section-heading row-heading result-panel-heading">
        <div>
          <h2>{language === 'en' ? 'Recommendations' : '추천 결과'}</h2>
        </div>
        <button className="share-button" onClick={onShare} disabled={!recommendations.length}>{t('share', language)}</button>
      </div>

      {isLoading && (
        <div className="skeleton-list" aria-live="polite">
          {Array.from({ length: 5 }).map((_, index) => <div className="skeleton-card" key={index} />)}
        </div>
      )}

      {!isLoading && error && (
        <div className="state-card error-card">
          <strong>{language === 'en' ? 'Unable to load data.' : '데이터를 불러오지 못했습니다.'}</strong>
          <p>{error}</p>
          <button className="ghost-button" onClick={onRetry}>{language === 'en' ? 'Retry' : '다시 시도'}</button>
        </div>
      )}

      {!isLoading && !error && !recommendations.length && (
        <div className="state-card"><p>{t('empty', language)}</p></div>
      )}

      {!isLoading && !error && recommendations.length > 0 && (
        <div className="result-list result-list-reference">
          {recommendations.map(item => (
            <ResultCard key={item.region_id} item={item} onOpen={() => onOpenRegion(item.region_id)} language={language} />
          ))}
        </div>
      )}
    </aside>
  );
}
