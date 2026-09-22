const API_URL = "http://localhost:3000";
let refreshInFlight = null;

export class SessionExpiredError extends Error {
  constructor(message = "Your session has expired. Please log in again.") {
    super(message);
    this.name = "SessionExpiredError";
  }
}

async function readResponse(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || data?.message || fallbackMessage);
  }

  return data;
}

export async function register(email, password) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return readResponse(response, "Registration failed");
}

export async function login(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await readResponse(response, "Login failed");

  await chrome.storage.local.set({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });

  return data;
}

export async function getTokens() {
  return chrome.storage.local.get(["accessToken", "refreshToken"]);
}

export async function clearTokens() {
  await chrome.storage.local.remove(["accessToken", "refreshToken"]);
}

function accessTokenNeedsRefresh(accessToken) {
  try {
    const payload = accessToken.split(".")[1];
    const { exp } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));

    // Refresh 30 seconds before expiry so a capture is not interrupted mid-request.
    return !Number.isFinite(exp) || exp * 1000 <= Date.now() + 30_000;
  } catch {
    return true;
  }
}

export async function getValidAccessToken() {
  const { accessToken, refreshToken } = await getTokens();

  if (!accessToken || !refreshToken) {
    await clearTokens();
    throw new SessionExpiredError();
  }

  return accessTokenNeedsRefresh(accessToken)
    ? refreshAccessToken()
    : accessToken;
}

export async function refreshAccessToken() {
  // Refresh-token rotation means only one refresh request can safely run at once.
  // Share it with callers that receive a 401 at the same time.
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = refreshAccessTokenRequest();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function refreshAccessTokenRequest() {
  const { refreshToken } = await getTokens();

  if (!refreshToken) {
    await clearTokens();
    throw new SessionExpiredError();
  }

  let response;
  try {
    response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    throw new Error("Could not connect to the API. Please try again.");
  }

  if (response.status === 401 || response.status === 403) {
    await clearTokens();
    throw new SessionExpiredError();
  }

  let data;
  try {
    data = await readResponse(response, "Session expired. Please log in again.");
  } catch {
    throw new Error("Could not refresh your session. Please try again.");
  }

  await chrome.storage.local.set({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });

  return data.accessToken;
}

export async function logout() {
  const { refreshToken } = await getTokens();

  if (refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken,
        }),
      });
    } catch {
      // Even if the API is unavailable,
      // remove the local session.
    }
  }

  await clearTokens();
}

export async function authenticatedFetch(url, options = {}) {
  let accessToken = await getValidAccessToken();

  const request = (token) => {
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...options, headers });
  };

  const tokenUsedForRequest = accessToken;
  let response = await request(tokenUsedForRequest);

  if (response.status === 401) {
    const latestTokens = await getTokens();

    // A different request may have refreshed the session while this request
    // was in flight. Reuse that token instead of rotating again.
    accessToken =
      latestTokens.accessToken && latestTokens.accessToken !== tokenUsedForRequest
        ? latestTokens.accessToken
        : await refreshAccessToken();

    response = await request(accessToken);

    if (response.status === 401) {
      await clearTokens();
      throw new SessionExpiredError();
    }
  }

  return response;
}
