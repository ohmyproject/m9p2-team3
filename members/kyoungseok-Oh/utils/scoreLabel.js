export function getScoreLabel(score) {
  const n = Number(score) || 0;
  if (n <= 20) return { label: '최저권', labelEn: 'Lowest band', desc: '17개 시도·시군구 비교에서 상대적으로 낮은 구간입니다.', color: '#ef4444' };
  if (n <= 40) return { label: '낮은 편', labelEn: 'Low', desc: '비교 지역 대비 다소 낮은 수준입니다.', color: '#f97316' };
  if (n <= 60) return { label: '보통', labelEn: 'Average', desc: '비교 지역 중 중간 수준입니다.', color: '#eab308' };
  if (n <= 80) return { label: '높은 편', labelEn: 'High', desc: '비교 지역 대비 양호한 수준입니다.', color: '#22c55e' };
  return { label: '최고권', labelEn: 'Highest band', desc: '17개 시도·시군구 비교에서 상대적으로 높은 구간입니다.', color: '#15803d' };
}

export function displayScore(score, language = 'ko') {
  const label = getScoreLabel(score);
  const value = Number(score ?? 0).toFixed(1);
  return language === 'en' ? `${label.labelEn} · ${value}` : `${label.label} · 상대점수 ${value}`;
}
