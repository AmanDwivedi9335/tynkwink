import type { AuthState } from "../common/types";

const statusEl = document.getElementById("status") as HTMLDivElement;
const openWaBtn = document.getElementById("open-wa") as HTMLButtonElement;
const clearBtn = document.getElementById("clear") as HTMLButtonElement;
const apiBaseInput = document.getElementById("api-base") as HTMLInputElement;
const saveApiBtn = document.getElementById("save-api") as HTMLButtonElement;
let currentAuth: AuthState | null = null;

async function load() {
  const res = await chrome.runtime.sendMessage({ type: "AUTH_GET" });
  if (!res?.ok) {
    statusEl.textContent = `Error loading auth: ${res?.error || "unknown"}`;
    return;
  }

  const auth = res.auth as AuthState;
  currentAuth = auth;
  apiBaseInput.value = auth.apiBase ?? "";
  statusEl.textContent = auth.token ? "CRM credentials loaded." : "Not logged in yet.";
}

openWaBtn.onclick = () => {
  chrome.tabs.create({ url: "https://web.whatsapp.com" });
};

clearBtn.onclick = async () => {
  statusEl.textContent = "Clearing saved credentials...";
  const auth: AuthState = { apiBase: null, tenantId: null, token: null };
  const res = await chrome.runtime.sendMessage({ type: "AUTH_SAVE", auth });
  statusEl.textContent = res?.ok ? "Cleared." : `Clear failed: ${res?.error || "unknown"}`;
  if (res?.ok) {
    currentAuth = auth;
    apiBaseInput.value = "";
  }
};

saveApiBtn.onclick = async () => {
  statusEl.textContent = "Saving API Base URL...";
  const nextApiBase = apiBaseInput.value.trim() || null;
  const shouldClearToken = currentAuth?.apiBase !== nextApiBase;
  const auth: AuthState = {
    apiBase: nextApiBase,
    tenantId: shouldClearToken ? null : currentAuth?.tenantId ?? null,
    token: shouldClearToken ? null : currentAuth?.token ?? null
  };
  const res = await chrome.runtime.sendMessage({ type: "AUTH_SAVE", auth });
  statusEl.textContent = res?.ok ? "API Base URL saved." : `Save failed: ${res?.error || "unknown"}`;
  if (res?.ok) {
    currentAuth = auth;
  }
};

load();
