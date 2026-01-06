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
var DEFAULT_API_BASE = "http://localhost:4000";
var API_PREFIX = "/api";
var LOGIN_TIMEOUT_MS = 12e3;
var SYNC_TIMEOUT_MS = 2e4;
var RETRY_STATUSES = /* @__PURE__ */ new Set([429, 502, 503, 504]);
function buildApiUrl(apiBase, path) {
  const trimmed = apiBase.replace(/\/+$/, "");
  if (trimmed.endsWith(API_PREFIX)) {
    return `${trimmed}${path}`;
  }
  return `${trimmed}${API_PREFIX}${path}`;
}
function isLocalhost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}
function normalizeApiBase(raw) {
  if (!raw) return { apiBase: null, error: null };
  try {
    const url = new URL(raw);
    if (url.search || url.hash) {
      return { apiBase: null, error: "API Base URL must not include query parameters or fragments." };
    }
    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalhost(url.hostname))) {
      return { apiBase: null, error: "API Base URL must use https (http allowed only for localhost)." };
    }
    const pathname = url.pathname.replace(/\/+$/, "");
    const normalized = `${url.origin}${pathname ? pathname : ""}`;
    return { apiBase: normalized, error: null };
  } catch {
    return { apiBase: null, error: "API Base URL is not a valid URL." };
  }
}
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}
async function readResponseBody(resp) {
  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return resp.json().catch(() => ({}));
  }
  const text = await resp.text().catch(() => "");
  return text ? { message: text } : {};
}
async function fetchWithRetry(url, options, timeoutMs, retries = 0) {
  let attempt = 0;
  while (true) {
    attempt += 1;
    const resp = await fetchWithTimeout(url, options, timeoutMs);
    if (!RETRY_STATUSES.has(resp.status) || attempt > retries) {
      return resp;
    }
    await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
  }
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message.type === "AUTH_SAVE") {
        const apiBaseRaw = (message.auth.apiBase ?? "").trim();
        const { apiBase, error } = normalizeApiBase(apiBaseRaw || null);
        if (error) {
          sendResponse({ ok: false, error });
          return;
        }
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
        const apiBaseInput = auth.apiBase || DEFAULT_API_BASE;
        const { apiBase, error } = normalizeApiBase(apiBaseInput);
        if (!apiBase || error) {
          sendResponse({
            ok: false,
            error: error || "API Base URL is required. Set it from the extension popup."
          });
          return;
        }
        if (!message.payload.email || !message.payload.password) {
          sendResponse({ ok: false, error: "Email and password are required." });
          return;
        }
        const url = buildApiUrl(apiBase, "/auth/login");
        let resp;
        try {
          resp = await fetchWithTimeout(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: message.payload.email,
              password: message.payload.password,
              tenantId: message.payload.tenantId || void 0
            })
          }, LOGIN_TIMEOUT_MS);
        } catch (error2) {
          sendResponse({
            ok: false,
            error: error2?.name === "AbortError" ? "Login request timed out. Please try again." : error2?.message === "Failed to fetch" ? "Unable to reach Tynkwink CRM. Check your internet connection or API Base URL." : error2?.message || "Unable to reach Tynkwink CRM."
          });
          return;
        }
        const data = await readResponseBody(resp);
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
        const url = buildApiUrl(auth.apiBase, "/integrations/whatsapp-web/sync");
        let resp;
        try {
          resp = await fetchWithRetry(url, {
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
          }, SYNC_TIMEOUT_MS, 2);
        } catch (error) {
          sendResponse({
            ok: false,
            error: error?.name === "AbortError" ? "Sync request timed out. Please try again." : error?.message || "Unable to reach Tynkwink CRM."
          });
          return;
        }
        const data = await readResponseBody(resp);
        if (!resp.ok) {
          if (resp.status === 401 || resp.status === 403) {
            await saveAuth({ apiBase: auth.apiBase, token: null, tenantId: null });
          }
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
