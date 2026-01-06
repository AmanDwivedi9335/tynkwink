// src/common/storage.ts
var KEY = "tynkwink_auth_v1";
async function saveAuth(auth) {
  await chrome.storage.local.set({ [KEY]: auth });
}
async function getAuth() {
  const res = await chrome.storage.local.get([KEY]);
  const auth = res[KEY];
  return {
    apiBase: auth?.apiBase ?? null,
    token: auth?.token ?? null,
    tenantId: auth?.tenantId ?? null
  };
}

// src/background.ts
var DEFAULT_API_BASE = "http://locahost:4000/api";
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === "AUTH_SAVE") {
        const apiBase = (message.auth.apiBase ?? "").trim().replace(/\/+$/, "");
        const token = (message.auth.token ?? "").trim();
        const tenantId = (message.auth.tenantId ?? "").trim();
        await saveAuth({
          apiBase: apiBase || null,
          token: token || null,
          tenantId: tenantId || null
        });
        sendResponse({ ok: true });
        return;
      }
      if (message.type === "AUTH_GET") {
        const auth = await getAuth();
        sendResponse({ ok: true, auth });
        return;
      }
      if (message.type === "AUTH_LOGIN") {
        const auth = await getAuth();
        const apiBase = auth.apiBase || DEFAULT_API_BASE;
        const url = `${apiBase}/api/auth/login`;
        let resp;
        try {
          resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: message.payload.email,
              password: message.payload.password,
              tenantId: message.payload.tenantId || void 0
            })
          });
        } catch (error) {
          sendResponse({
            ok: false,
            error: error?.message === "Failed to fetch" ? "Unable to reach Tynkwink CRM. Check your internet connection or API Base URL." : error?.message || "Unable to reach Tynkwink CRM."
          });
          return;
        }
        const data = await resp.json().catch(async () => {
          const text = await resp.text().catch(() => "");
          return text ? { message: text } : {};
        });
        if (!resp.ok) {
          sendResponse({ ok: false, error: data?.message || `Login failed (status ${resp.status}).` });
          return;
        }
        if (data?.requiresTenantSelection) {
          sendResponse({
            ok: true,
            requiresTenantSelection: true,
            tenants: data?.tenants ?? []
          });
          return;
        }
        await saveAuth({
          apiBase,
          token: data?.accessToken || null,
          tenantId: data?.tenantId || null
        });
        sendResponse({
          ok: true,
          auth: {
            apiBase,
            token: data?.accessToken || null,
            tenantId: data?.tenantId || null
          }
        });
        return;
      }
      if (message.type === "SYNC_CHAT") {
        const auth = await getAuth();
        if (!auth.apiBase || !auth.token || !auth.tenantId) {
          sendResponse({ ok: false, error: "Not authenticated. Log in to Tynkwink CRM from the WhatsApp overlay." });
          return;
        }
        const url = `${auth.apiBase}/api/integrations/whatsapp-web/sync`;
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${auth.token}`
          },
          body: JSON.stringify({
            tenantId: auth.tenantId,
            // backend should override/verify against token claims
            ...message.payload
          })
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          sendResponse({
            ok: false,
            error: data?.message || "Sync failed",
            status: resp.status,
            data
          });
          return;
        }
        sendResponse({ ok: true, data });
        return;
      }
      sendResponse({ ok: false, error: "Unknown message type" });
    } catch (e) {
      sendResponse({ ok: false, error: e?.message || "Unexpected error" });
    }
  })();
  return true;
});
//# sourceMappingURL=background.js.map
