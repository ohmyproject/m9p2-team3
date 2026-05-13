import { CATEGORIES } from '../constants/categories';
import { sumWeights } from '../utils/normalize';
import { t } from '../utils/i18n';

export function WeightPanel({ presets, selectedPreset, weights, setWeights, onSelectPreset, onRun, onReset, isLoading, language }) {
  const total = sumWeights(weights);
  const invalid = total <= 0;

  function updateWeight(key, value) {
    setWeights(prev => ({ ...prev, [key]: Number(value) }));
  }

  return (
    <aside className="panel weight-panel" aria-label="가중치 및 프리셋 설정">
      <section>
        <div className="section-heading">
          <h2>{language === 'en' ? 'Travel style' : '체류 유형 선택'}</h2>
        </div>
        <div className="preset-list">
          {presets.map(preset => (
            <button
              key={preset.preset_id}
              className={`preset-card ${selectedPreset === preset.preset_id ? 'active' : ''}`}
              onClick={() => onSelectPreset(preset)}
              type="button"
            >
              <strong>{language === 'en' ? preset.name_en : preset.name_ko}</strong>
              <span>{language === 'en' ? preset.description_en : preset.description_ko}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="weights-section">
        <div className="section-heading row-heading">
          <div>
            <h2>{language === 'en' ? 'Category weights' : '5대 카테고리 가중치'}</h2>
          </div>
          <span className={`weight-sum ${invalid ? 'danger' : ''}`}>{total}</span>
        </div>

        <p className="notice">{t('weightNotice', language)}</p>

        <div className="slider-list">
          {CATEGORIES.map(category => (
            <label className="weight-slider" key={category.key}>
              <span className="slider-label">
                <span>{category.icon} {language === 'en' ? category.en : category.ko}</span>
                <b>{weights[category.key]}</b>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={weights[category.key] ?? 0}
                onChange={event => updateWeight(category.key, event.target.value)}
                aria-label={`${language === 'en' ? category.en : category.ko} 가중치`}
              />
            </label>
          ))}
        </div>

        {invalid && <p className="inline-error">모든 가중치가 0일 수 없습니다.</p>}

        <div className="action-row">
          <button className="primary-button" disabled={isLoading || invalid} onClick={onRun}>
            {isLoading ? (language === 'en' ? 'Calculating...' : '계산 중...') : t('run', language)}
          </button>
          <button className="ghost-button" onClick={onReset}>{t('reset', language)}</button>
        </div>
      </section>
    </aside>
  );
}
