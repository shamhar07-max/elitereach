const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4200/api";

export const api = async (path: string, opts: RequestInit = {}) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("reach_token") : null;
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || body.error || res.statusText);
  }
  return res.status === 204 ? null : res.json();
};
