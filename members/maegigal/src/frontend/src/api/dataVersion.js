import { apiFetch } from './apiClient';

export function fetchLatestDataVersion() {
  return apiFetch('/data-versions/latest');
}
