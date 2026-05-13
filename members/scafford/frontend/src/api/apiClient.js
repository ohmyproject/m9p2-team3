const BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'API 오류가 발생했습니다.');
  }
  return res.json();
}
