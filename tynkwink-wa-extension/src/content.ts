import { mountOverlay } from "./ui/overlay";
import type { SyncPayload, WhatsAppMessage, Direction } from "./common/types";

const EXTRACTOR_VERSION = "dom-v1";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * IMPORTANT:
 * WhatsApp Web DOM changes frequently. These selectors are heuristic.
 * You will likely need to adjust logic here over time.
 */
function getChatTitle(): string {
  // Strategy:
  // 1) find a header area
  // 2) choose the most prominent text node
  const header = document.querySelector("header");
  if (!header) return "Unknown";

  const candidates = Array.from(header.querySelectorAll("span"))
    .map((s) => (s.textContent || "").trim())
    .filter((t) => t.length > 0);

  // Heuristic: pick the longest among top few
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] || "Unknown";
}

/**
 * Best-effort detection:
 * WhatsApp Web may not provide phone numbers in DOM reliably.
 * Treat phoneE164 as optional.
 */
function getPhoneE164BestEffort(): string | null {
  // CHANGE HERE if you find a stable way in your WhatsApp Web version.
  return null;
}

/**
 * Message extraction:
 * MVP extracts visible text nodes from message bubbles.
 * This is not perfect: it may capture extra UI texts.
 */
function extractVisibleMessages(limit = 50): WhatsAppMessage[] {
  // Primary region where messages are likely rendered
  const main = document.querySelector("main");
  if (!main) return [];

  // Try to capture message bubble text spans. WhatsApp often uses spans for text.
  const spans = Array.from(main.querySelectorAll("span"))
    .map((n) => (n.textContent || "").trim())
    .filter((t) => t.length > 0);

  // Basic de-noising: remove very common UI artifacts
  const noise = new Set(["Search", "Type a message", "Today", "Yesterday"]);
  const cleaned = spans.filter((t) => !noise.has(t));

  const recent = cleaned.slice(-limit);

  // Direction inference is hard with naive DOM.
  // Later you can infer using bubble alignment/classes.
  const direction: Direction = "unknown";

  return recent.map((text) => ({
    text,
    direction,
    ts: null
  }));
}

async function buildPayload(): Promise<SyncPayload> {
  const title = getChatTitle();
  const isGroup = false; // CHANGE HERE: implement group detection if needed
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
      capturedAt: new Date().toISOString(),
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

async function loginCrm(payload: { email: string; password: string; tenantId?: string | null }) {
  const res = await chrome.runtime.sendMessage({ type: "AUTH_LOGIN", payload });
  return res;
}

async function loadSummary() {
  const res = await chrome.runtime.sendMessage({ type: "EXTENSION_SUMMARY" });
  return res;
}

function getChatSnapshot() {
  return {
    name: getChatTitle() || null,
    phone: getPhoneE164BestEffort()
  };
}

/**
 * WhatsApp Web is SPA; the DOM might not be ready immediately even at document_idle.
 * We mount overlay after main/header appear.
 */
async function init() {
  for (let i = 0; i < 30; i++) {
    const header = document.querySelector("header");
    const main = document.querySelector("main");
    if (header && main) break;
    await sleep(500);
  }

  mountOverlay({
    onSync: syncCurrentChat,
    onCheckAuth: checkAuth,
    onLogin: loginCrm,
    onGetSummary: loadSummary,
    onGetChatSnapshot: getChatSnapshot
  });
}

init();
