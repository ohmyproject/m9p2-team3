import { apiFetch } from './apiClient';

export function fetchRegions(regionLevel = 'sigungu') {
  return apiFetch(`/regions?region_level=${regionLevel}`);
}

export function fetchRegionDetail(regionId) {
  return apiFetch(`/regions/${regionId}/details`);
}

export function fetchScores(regionLevel = 'sigungu') {
  return apiFetch(`/scores?region_level=${regionLevel}`);
}
