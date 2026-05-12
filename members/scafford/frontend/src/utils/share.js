export function buildShareUrl({ weights, presetId, topRegionId, viewMode, isSeniorMode, language }) {
  const params = new URLSearchParams({
    preset: presetId || 'default',
    t: weights.traffic,
    c: weights.culture,
    cv: weights.convenience,
    s: weights.safety,
    n: weights.nature,
    r: topRegionId || '',
    view: viewMode || 'simple',
    senior: isSeniorMode ? '1' : '0',
    lang: language || 'ko'
  });
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

export function parseShareParams() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('t')) return null;
  return {
    presetId: params.get('preset') || 'default',
    weights: {
      traffic: Number(params.get('t')) || 0,
      culture: Number(params.get('c')) || 0,
      convenience: Number(params.get('cv')) || 0,
      safety: Number(params.get('s')) || 0,
      nature: Number(params.get('n')) || 0
    },
    topRegionId: params.get('r') || null,
    viewMode: params.get('view') || 'simple',
    isSeniorMode: params.get('senior') === '1',
    language: params.get('lang') || 'ko'
  };
}
