// src/popup/popup.ts
var statusEl = document.getElementById("status");
var openWaBtn = document.getElementById("open-wa");
var clearBtn = document.getElementById("clear");
var apiBaseInput = document.getElementById("api-base");
var saveApiBtn = document.getElementById("save-api");
var currentAuth = null;
async function load() {
  const res = await chrome.runtime.sendMessage({ type: "AUTH_GET" });
  if (!res?.ok) {
    statusEl.textContent = `Error loading auth: ${res?.error || "unknown"}`;
    return;
  }
  const auth = res.auth;
  currentAuth = auth;
  apiBaseInput.value = auth.apiBase ?? "";
  statusEl.textContent = auth.token ? "CRM credentials loaded." : "Not logged in yet.";
}
openWaBtn.onclick = () => {
  chrome.tabs.create({ url: "https://web.whatsapp.com" });
};
clearBtn.onclick = async () => {
  statusEl.textContent = "Clearing saved credentials...";
  const auth = { apiBase: null, tenantId: null, token: null };
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
  const auth = {
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
//# sourceMappingURL=popup.js.map
