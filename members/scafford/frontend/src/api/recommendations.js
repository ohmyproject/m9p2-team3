import { apiFetch } from './apiClient';

export function postRecommendations(payload) {
  return apiFetch('/recommendations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
