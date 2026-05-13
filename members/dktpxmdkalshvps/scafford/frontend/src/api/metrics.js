import { apiFetch } from './apiClient';

export function fetchMetrics() {
  return apiFetch('/metrics');
}
