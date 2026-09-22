import {
  authenticatedFetch,
  clearTokens,
  getValidAccessToken,
  login,
  logout,
  register,
  SessionExpiredError,
} from "./auth.js";

const API_URL = "http://localhost:3000";
const authView = document.getElementById("authView");
const captureView = document.getElementById("captureView");
const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authSubmit = document.getElementById("authSubmit");
const authModeToggle = document.getElementById("authModeToggle");
const signedInAs = document.getElementById("signedInAs");
const logoutButton = document.getElementById("logoutButton");
const saveButton = document.getElementById("saveButton");
const status = document.getElementById("status");

let isRegisterMode = false;

function setStatus(message = "", type = "") {
  status.textContent = message;
  status.className = type;
}

function setAuthenticated(isAuthenticated) {
  authView.classList.toggle("hidden", isAuthenticated);
  captureView.classList.toggle("hidden", !isAuthenticated);
}

function setAuthMode(registerMode) {
  isRegisterMode = registerMode;
  authSubmit.textContent = registerMode ? "Create account" : "Log in";
  authModeToggle.textContent = registerMode
    ? "Already have an account? Log in"
    : "Create an account";
  passwordInput.autocomplete = registerMode ? "new-password" : "current-password";
}

async function initialise() {
  setAuthenticated(false);
  setStatus("Checking session...");

  try {
    await getValidAccessToken();
    setAuthenticated(true);
    setStatus();
  } catch (error) {
    setAuthenticated(false);
    setStatus(
      error instanceof SessionExpiredError
        ? "Your session expired. Please log in again."
        : error instanceof Error
          ? error.message
          : "Could not restore your session.",
      "error",
    );
  }
}

authModeToggle.addEventListener("click", () => {
  setAuthMode(!isRegisterMode);
  setStatus();
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  authSubmit.disabled = true;
  setStatus(isRegisterMode ? "Creating account..." : "Logging in...");

  try {
    if (isRegisterMode) await register(email, password);
    await login(email, password);
    signedInAs.textContent = email;
    passwordInput.value = "";
    setAuthenticated(true);
    setStatus("Signed in successfully.", "success");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), "error");
  } finally {
    authSubmit.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  try {
    await logout();
  } finally {
    await clearTokens();
    setAuthenticated(false);
    setStatus("Signed out.", "success");
    logoutButton.disabled = false;
  }
});

saveButton.addEventListener("click", async () => {
  try {
    saveButton.disabled = true;
    setStatus("Capturing page...");

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("Could not find the active tab.");

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const meta = (selector) =>
          document.querySelector(selector)?.getAttribute("content")?.trim() || null;
        const article = document.querySelector("article") || document.querySelector("main");
        const html = document.documentElement.outerHTML;

        return {
          url: window.location.href,
          title: document.title?.trim() || meta('meta[property="og:title"]') || null,
          description: meta('meta[name="description"]') || meta('meta[property="og:description"]'),
          thumbnailUrl: meta('meta[property="og:image"]') || meta('meta[name="twitter:image"]'),
          selectedText: window.getSelection()?.toString().trim() || null,
          content: (article || document.body)?.innerText?.trim() || "",
          html: html.length <= 1_000_000 ? html : null,
        };
      },
    });

    const capture = result?.result;
    if (!capture) throw new Error("Failed to capture the page.");

    setStatus("Saving bookmark...");
    const response = await authenticatedFetch(`${API_URL}/captures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: capture.url,
        title: capture.title,
        browserData: {
          title: capture.title,
          html: capture.html,
          content: capture.content,
          description: capture.description,
          thumbnailUrl: capture.thumbnailUrl,
          selectedText: capture.selectedText,
        },
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || data?.message || `Request failed (${response.status}).`);
    }

    setStatus("Saved successfully.", "success");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof SessionExpiredError) {
      setAuthenticated(false);
      setStatus("Your session expired. Please log in again.", "error");
    } else {
      setStatus(message, "error");
    }
  } finally {
    saveButton.disabled = false;
  }
});

initialise();
