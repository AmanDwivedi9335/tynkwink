// src/popup/popup.ts
var statusEl = document.getElementById("status");
var openWaBtn = document.getElementById("open-wa");
var clearBtn = document.getElementById("clear");
async function load() {
  const res = await chrome.runtime.sendMessage({ type: "AUTH_GET" });
  if (!res?.ok) {
    statusEl.textContent = `Error loading auth: ${res?.error || "unknown"}`;
    return;
  }
  const auth = res.auth;
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
};
load();
//# sourceMappingURL=popup.js.map
