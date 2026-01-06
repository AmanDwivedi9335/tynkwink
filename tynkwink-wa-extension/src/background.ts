import type { BgMessage } from "./common/types";
import { getAuth, saveAuth } from "./common/storage";

chrome.runtime.onMessage.addListener((message: BgMessage, _sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === "AUTH_SAVE") {
        // Basic normalization
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

      if (message.type === "SYNC_CHAT") {
        const auth = await getAuth();
        if (!auth.apiBase || !auth.token || !auth.tenantId) {
          sendResponse({ ok: false, error: "Not authenticated. Open extension popup and set API Base, Tenant ID, Token." });
          return;
        }

        // CHANGE HERE: Your backend route path
        const url = `${auth.apiBase}/api/integrations/whatsapp-web/sync`;

        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${auth.token}`
          },
          body: JSON.stringify({
            tenantId: auth.tenantId, // backend should override/verify against token claims
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
    } catch (e: any) {
      sendResponse({ ok: false, error: e?.message || "Unexpected error" });
    }
  })();

  // Required for async response
  return true;
});
