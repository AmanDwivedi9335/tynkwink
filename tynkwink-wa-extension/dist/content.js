// src/ui/overlay.ts
function el(tag, attrs = {}) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}
function mountOverlay(opts) {
  const id = "tw-wa-overlay-root";
  if (document.getElementById(id)) return;
  const root = el("div");
  root.id = id;
  root.style.position = "fixed";
  root.style.top = "90px";
  root.style.right = "18px";
  root.style.width = "340px";
  root.style.zIndex = "999999";
  root.style.background = "#fff";
  root.style.border = "1px solid rgba(0,0,0,0.12)";
  root.style.borderRadius = "14px";
  root.style.boxShadow = "0 14px 40px rgba(0,0,0,0.18)";
  root.style.padding = "12px";
  root.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
  const header = el("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  const title = el("div");
  title.textContent = "Tynkwink CRM";
  title.style.fontWeight = "700";
  const close = el("button");
  close.textContent = "\u2715";
  close.style.border = "none";
  close.style.background = "transparent";
  close.style.cursor = "pointer";
  close.style.fontSize = "14px";
  header.appendChild(title);
  header.appendChild(close);
  const status = el("div");
  status.style.marginTop = "8px";
  status.style.fontSize = "12px";
  status.style.color = "#555";
  status.textContent = "Checking authentication...";
  const syncBtn = el("button");
  syncBtn.textContent = "Sync current chat";
  syncBtn.style.marginTop = "10px";
  syncBtn.style.width = "100%";
  syncBtn.style.padding = "10px";
  syncBtn.style.borderRadius = "12px";
  syncBtn.style.border = "1px solid #111";
  syncBtn.style.background = "#fff";
  syncBtn.style.cursor = "pointer";
  syncBtn.style.fontWeight = "600";
  const log = el("pre");
  log.style.marginTop = "10px";
  log.style.background = "#f7f7f7";
  log.style.padding = "10px";
  log.style.borderRadius = "12px";
  log.style.maxHeight = "220px";
  log.style.overflow = "auto";
  log.style.fontSize = "11px";
  log.textContent = "";
  const note = el("div");
  note.style.marginTop = "8px";
  note.style.fontSize = "11px";
  note.style.color = "#666";
  note.textContent = "Tip: If it says 'Not authenticated', open extension popup and set API Base, Tenant ID and Token.";
  root.appendChild(header);
  root.appendChild(status);
  root.appendChild(syncBtn);
  root.appendChild(log);
  root.appendChild(note);
  document.body.appendChild(root);
  close.onclick = () => root.remove();
  (async () => {
    const res = await opts.onCheckAuth();
    const token = res?.auth?.token;
    status.textContent = token ? "Authenticated." : "Not authenticated.";
  })();
  syncBtn.onclick = async () => {
    log.textContent = "Syncing...";
    try {
      const res = await opts.onSync();
      log.textContent = JSON.stringify(res, null, 2);
    } catch (e) {
      log.textContent = `Error: ${e?.message || "unknown"}`;
    }
  };
}

// src/content.ts
var EXTRACTOR_VERSION = "dom-v1";
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function getChatTitle() {
  const header = document.querySelector("header");
  if (!header) return "Unknown";
  const candidates = Array.from(header.querySelectorAll("span")).map((s) => (s.textContent || "").trim()).filter((t) => t.length > 0);
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] || "Unknown";
}
function getPhoneE164BestEffort() {
  return null;
}
function extractVisibleMessages(limit = 50) {
  const main = document.querySelector("main");
  if (!main) return [];
  const spans = Array.from(main.querySelectorAll("span")).map((n) => (n.textContent || "").trim()).filter((t) => t.length > 0);
  const noise = /* @__PURE__ */ new Set(["Search", "Type a message", "Today", "Yesterday"]);
  const cleaned = spans.filter((t) => !noise.has(t));
  const recent = cleaned.slice(-limit);
  const direction = "unknown";
  return recent.map((text) => ({
    text,
    direction,
    ts: null
  }));
}
async function buildPayload() {
  const title = getChatTitle();
  const isGroup = false;
  const phoneE164 = getPhoneE164BestEffort();
  const messages = extractVisibleMessages(50);
  return {
    contact: {
      displayName: title || null,
      phoneE164
    },
    chat: {
      title: title || "Unknown",
      isGroup
    },
    messages,
    meta: {
      pageUrl: location.href,
      capturedAt: (/* @__PURE__ */ new Date()).toISOString(),
      extractorVersion: EXTRACTOR_VERSION
    }
  };
}
async function syncCurrentChat() {
  const payload = await buildPayload();
  const res = await chrome.runtime.sendMessage({ type: "SYNC_CHAT", payload });
  return res;
}
async function checkAuth() {
  const res = await chrome.runtime.sendMessage({ type: "AUTH_GET" });
  return res;
}
async function init() {
  for (let i = 0; i < 30; i++) {
    const header = document.querySelector("header");
    const main = document.querySelector("main");
    if (header && main) break;
    await sleep(500);
  }
  mountOverlay({
    onSync: syncCurrentChat,
    onCheckAuth: checkAuth
  });
}
init();
//# sourceMappingURL=content.js.map
