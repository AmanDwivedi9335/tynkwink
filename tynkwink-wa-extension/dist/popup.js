// src/popup/popup.ts
var apiBaseEl = document.getElementById("apiBase");
var tenantIdEl = document.getElementById("tenantId");
var tokenEl = document.getElementById("token");
var statusEl = document.getElementById("status");
var saveBtn = document.getElementById("save");
async function load() {
  const res = await chrome.runtime.sendMessage({ type: "AUTH_GET" });
  if (!res?.ok) {
    statusEl.textContent = `Error loading auth: ${res?.error || "unknown"}`;
    return;
  }
  const auth = res.auth;
  apiBaseEl.value = auth.apiBase ?? "";
  tenantIdEl.value = auth.tenantId ?? "";
  tokenEl.value = auth.token ?? "";
  statusEl.textContent = auth.token ? "Loaded existing settings." : "No settings saved yet.";
}
saveBtn.onclick = async () => {
  statusEl.textContent = "Saving...";
  const auth = {
    apiBase: apiBaseEl.value.trim(),
    tenantId: tenantIdEl.value.trim(),
    token: tokenEl.value.trim()
  };
  const res = await chrome.runtime.sendMessage({ type: "AUTH_SAVE", auth });
  statusEl.textContent = res?.ok ? "Saved." : `Save failed: ${res?.error || "unknown"}`;
};
load();
//# sourceMappingURL=popup.js.map
