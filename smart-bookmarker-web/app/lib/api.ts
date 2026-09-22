const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

function getTokens() {
  if (typeof window === "undefined") return { access: null, refresh: null };
  return {
    access: localStorage.getItem("accessToken"),
    refresh: localStorage.getItem("refreshToken"),
  };
}

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
}

function clearTokens() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refresh } = getTokens();
  if (!refresh) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });

    if (!res.ok) {
      clearTokens();
      window.location.href = "/login";
      return null;
    }

    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    clearTokens();
    window.location.href = "/login";
    return null;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const { access } = getTokens();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (access) {
    headers["Authorization"] = `Bearer ${access}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // Token expired — attempt refresh once
  // Auth endpoints deliberately return 401 for invalid credentials or tokens.
  // Only refresh a session when an authenticated application request is rejected.
  if (response.status === 401 && retry && access && !path.startsWith("/auth/")) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;

    if (newToken) {
      return apiRequest<T>(path, options, false);
    }

    throw new Error("Session expired. Please log in again.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error ?? "Something went wrong");
  }

  return data as T;
}

export { setTokens, clearTokens, getTokens };
