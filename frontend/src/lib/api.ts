"use client";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function buildUrl(path: string) {
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const base = API_BASE.replace(/\/$/, "");
    return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

export async function fetchWithAuth(path: string, opts: RequestInit = {}) {
    const token = (typeof window !== 'undefined') ? localStorage.getItem("access_token") : null;
    if (!token) throw new Error("Not authenticated");

    const headers = { ...(opts.headers || {} as Record<string,string>), Authorization: `Bearer ${token}` } as Record<string,string>;

    const res = await fetch(buildUrl(path), { ...opts, headers });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `${res.status} ${res.statusText}`);
    }
    return res;
}

export async function getJsonWithAuth<T = any>(path: string, opts: RequestInit = {}) {
    const res = await fetchWithAuth(path, opts);
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
        return (await res.json()) as T;
    }
    // For non-JSON responses (like DELETE), return empty object
    return {} as T;
}

// Fetch a URL that does NOT require Authorization (e.g. presigned S3 URL)
export async function fetchTextUrl(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.text();
}

export async function fetchBlobUrl(url: string) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.blob();
}
