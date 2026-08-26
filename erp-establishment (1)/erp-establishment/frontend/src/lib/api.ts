const API_BASE = import.meta.env.VITE_API_URL || "/api";

function getToken() {
  return localStorage.getItem("erp_token");
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function saveSession(token: string, user: any) {
  localStorage.setItem("erp_token", token);
  localStorage.setItem("erp_user", JSON.stringify(user));
}

export function getCurrentUser() {
  const raw = localStorage.getItem("erp_user");
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem("erp_token");
  localStorage.removeItem("erp_user");
}
