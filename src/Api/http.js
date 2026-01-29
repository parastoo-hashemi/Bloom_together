const API_BASE = import.meta.env.VITE_API_BASE ?? ""; 
// In dev with proxy: "" (same origin). In prod: "https://yourdomain.com"

export async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = typeof data === "string" ? data : (data.error || "Request failed");
    throw new Error(msg);
  }
  return data;
}
