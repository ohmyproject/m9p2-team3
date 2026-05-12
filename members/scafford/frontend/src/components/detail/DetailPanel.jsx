import { useEffect, useRef } from 'react';
import { getRegionLogoUrl } from '../../utils/regionLogo';
import { getScoreLabel } from '../../utils/scoreLabel';
import { RadarChart } from './RadarChart.jsx';
import { MetricBars } from './MetricBars.jsx';
import { t } from '../../utils/i18n';

export function DetailPanel({ region, isLoading, onClose, language, viewMode }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!region) return undefined;
    closeRef.current?.focus();
    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [region, onClose]);

  if (!region && !isLoading) return null;

  return (
    <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="detail-panel" role="dialog" aria-modal="true" aria-label="지역 상세 정보">
        <button ref={closeRef} className="modal-close" onClick={onClose} aria-label="상세 패널 닫기">×</button>

        {isLoading && <div className="detail-loading">상세 정보를 불러오는 중입니다...</div>}

        {region && (
          <>
            <div className="detail-hero">
              <img
                className="region-logo"
                src={getRegionLogoUrl(region.parent_logo_key)}
                alt={`${region.parent_region_name_ko} 지역 로고 이미지`}
                onError={event => { event.currentTarget.style.display = 'none'; }}
              />
              <div>
                <p className="eyebrow">Region Detail</p>
                <h2>{language === 'en' ? region.region_name_en : region.region_name_ko}</h2>
                <p>{region.parent_region_name_ko} · {language === 'en' ? 'city/district tourism recommendation' : '시군구 관광지 추천 상세'}</p>
                <a href={region.naverMap?.webUrl} target="_blank" rel="noreferrer" className="naver-link">
                  {language === 'en' ? 'Open Naver Map' : '네이버 지도 열기'}
                </a>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-card chart-card">
                <h3>{language === 'en' ? 'Category relative scores' : '5대 카테고리 상대점수'}</h3>
                <RadarChart scores={region.categoryScores} language={language} />
              </div>

              <div className="detail-card spot-card">
                <h3>{t('spots', language)}</h3>
                <div className="spot-list">
                  {(region.tourist_spots || []).map(spot => (
                    <article key={spot.name}>
                      <strong>{spot.name}</strong>
                      <span>{spot.type}</span>
                      <p>{spot.description}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            {viewMode === 'detail' && (
              <div className="detail-card full-card">
                <div className="section-heading row-heading">
                  <div>
                    <p className="eyebrow">Raw Values</p>
                    <h3>{language === 'en' ? 'Metric details' : '세부 지표 및 실제값'}</h3>
                  </div>
                  <span className="notice-chip">score_100 = {language === 'en' ? 'relative score' : '상대점수'}</span>
                </div>
                <MetricBars metrics={region.metrics || []} language={language} />
              </div>
            )}

            {viewMode === 'simple' && (
              <div className="metric-summary">
                {(region.metrics || []).slice(0, 5).map(metric => {
                  const label = getScoreLabel(metric.score_100);
                  return (
                    <span key={metric.metric_id} style={{ borderColor: label.color }}>
                      {language === 'en' ? metric.metric_name_en : metric.metric_name_ko}: {label.label} ({metric.raw_value} {metric.unit})
                    </span>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
