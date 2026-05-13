import { apiFetch } from './apiClient';

export function fetchPresets() {
  return apiFetch('/presets');
}
