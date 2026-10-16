const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:8080/api/v1";
export const BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_ORIGIN as string | undefined) ?? "http://localhost:8080";

/** DICOM previews come back as "/images/x.jpg" (local storage) or a full Cloudinary URL. */
export function imageUrl(path: string): string {
  if (!path) return "";
  return path.startsWith("http") ? path : `${BACKEND_ORIGIN}${path}`;
}

function getToken(): string | null {
  try {
    const raw = localStorage.getItem("thyroai_admin_user");
    return raw ? (JSON.parse(raw) as { token?: string }).token ?? null : null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (options.headers) Object.assign(headers, options.headers as Record<string, string>);

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("thyroai_admin_user");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (res.status === 403) {
    let message = "Access denied. Your account or hospital has been disabled.";
    try {
      const body = await res.json() as { message?: string };
      if (body.message) message = body.message;
    } catch { /* use default */ }
    window.dispatchEvent(new CustomEvent("thyroai_admin:blocked", { detail: message }));
    throw new Error(message);
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json() as { error?: string };
      if (body.error) message = body.error;
    } catch { /* use default */ }
    throw new Error(message);
  }
  const json = await res.json();
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  getBlob: (path: string): Promise<Response> => {
    const token = getToken();
    return fetch(`${BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: formData });
    if (res.status === 401) { localStorage.removeItem("thyroai_admin_user"); window.location.href = "/login"; throw new Error("Unauthorized"); }
    if (res.status === 403) {
      let message = "Access denied. Your account or hospital has been disabled.";
      try { const body = await res.json() as { message?: string }; if (body.message) message = body.message; } catch { /* use default */ }
      window.dispatchEvent(new CustomEvent("thyroai_admin:blocked", { detail: message }));
      throw new Error(message);
    }
    if (!res.ok) {
      let message = `Upload failed (${res.status})`;
      try { const body = await res.json() as { error?: string }; if (body.error) message = body.error; } catch { /* use default */ }
      throw new Error(message);
    }
    const json = await res.json();
    return json.data as T;
  },
};
