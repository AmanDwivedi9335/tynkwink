import type { AuthState } from "../common/types";

const apiBaseEl = document.getElementById("apiBase") as HTMLInputElement;
const tenantIdEl = document.getElementById("tenantId") as HTMLInputElement;
const tokenEl = document.getElementById("token") as HTMLInputElement;
const statusEl = document.getElementById("status") as HTMLDivElement;
const saveBtn = document.getElementById("save") as HTMLButtonElement;

async function load() {
  const res = await chrome.runtime.sendMessage({ type: "AUTH_GET" });
  if (!res?.ok) {
    statusEl.textContent = `Error loading auth: ${res?.error || "unknown"}`;
    return;
  }

  const auth = res.auth as AuthState;
  apiBaseEl.value = auth.apiBase ?? "";
  tenantIdEl.value = auth.tenantId ?? "";
  tokenEl.value = auth.token ?? "";
  statusEl.textContent = auth.token ? "Loaded existing settings." : "No settings saved yet.";
}

saveBtn.onclick = async () => {
  statusEl.textContent = "Saving...";
  const auth: AuthState = {
    apiBase: apiBaseEl.value.trim(),
    tenantId: tenantIdEl.value.trim(),
    token: tokenEl.value.trim()
  };

  const res = await chrome.runtime.sendMessage({ type: "AUTH_SAVE", auth });
  statusEl.textContent = res?.ok ? "Saved." : `Save failed: ${res?.error || "unknown"}`;
};

load();
