const dictionary = {
  title: { ko: '시군구 관광지 추천', en: 'Tourism Recommender' },
  subtitle: { ko: '가중치 기반 장기체류 최적 지역 탐색', en: 'Weighted long-stay destination discovery' },
  simple: { ko: '간편', en: 'Simple' },
  detail: { ko: '상세', en: 'Detail' },
  senior: { ko: '시니어', en: 'Senior' },
  run: { ko: '추천 실행', en: 'Recommend' },
  reset: { ko: '초기화', en: 'Reset' },
  top5: { ko: '추천 Top 5', en: 'Top 5 Recommendations' },
  finalScore: { ko: '최종 추천점수', en: 'Final score' },
  reasons: { ko: '추천 이유', en: 'Reasons' },
  spots: { ko: '추천 관광지', en: 'Recommended spots' },
  detailView: { ko: '상세 보기', en: 'Details' },
  share: { ko: '공유', en: 'Share' },
  copied: { ko: '공유 URL이 복사되었습니다.', en: 'Share URL copied.' },
  weightNotice: { ko: '입력한 가중치는 추천 계산 시 자동 정규화됩니다.', en: 'Weights are normalized automatically.' },
  empty: { ko: '조건에 맞는 추천 지역이 없습니다. 가중치를 조정해 주세요.', en: 'No matching regions. Adjust weights and try again.' }
};

export function t(key, language = 'ko') {
  return dictionary[key]?.[language] || dictionary[key]?.ko || key;
}
