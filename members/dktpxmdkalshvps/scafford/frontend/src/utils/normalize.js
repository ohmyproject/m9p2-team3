import { CATEGORIES } from '../constants/categories';

export function normalizeWeights(raw) {
  const total = CATEGORIES.reduce((sum, item) => sum + (Number(raw[item.key]) || 0), 0);
  if (total <= 0) {
    throw new Error('모든 가중치가 0일 수 없습니다.');
  }
  return Object.fromEntries(
    CATEGORIES.map(item => [item.key, Number(((Number(raw[item.key]) || 0) / total).toFixed(6))])
  );
}

export function toSliderWeights(weights01) {
  return Object.fromEntries(
    CATEGORIES.map(item => [item.key, Math.round((Number(weights01[item.key]) || 0) * 100)])
  );
}

export function sumWeights(raw) {
  return CATEGORIES.reduce((sum, item) => sum + (Number(raw[item.key]) || 0), 0);
}
