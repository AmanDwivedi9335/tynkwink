import type { BgMessage } from "./common/types";
import { getAuth, saveAuth } from "./common/storage";

const DEFAULT_API_BASE = "https://api.tynkwink.com";

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

      if (message.type === "AUTH_LOGIN") {
        const auth = await getAuth();
        const apiBase = auth.apiBase || DEFAULT_API_BASE;
        const url = `${apiBase}/api/auth/login`;

        let resp: Response;
        try {
          resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: message.payload.email,
              password: message.payload.password,
              tenantId: message.payload.tenantId || undefined
            })
          });
        } catch (error: any) {
          sendResponse({
            ok: false,
            error:
              error?.message === "Failed to fetch"
                ? "Unable to reach Tynkwink CRM. Check your internet connection or API Base URL."
                : error?.message || "Unable to reach Tynkwink CRM."
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
