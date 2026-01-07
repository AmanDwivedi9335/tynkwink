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
const ignoredPresence = new Set(["online", "typing...", "typing…", "last seen"]);
const phonePattern = /(\+?\d[\d\s().-]{6,}\d)/;

const normalizePhone = (value: string | null | undefined) => {
  if (!value) return null;
  const match = value.match(phonePattern);
  if (!match) return null;
  let normalized = match[0].replace(/[^\d+]/g, "");
  if (normalized.startsWith("00")) {
    normalized = `+${normalized.slice(2)}`;
  }
  if (normalized.startsWith("+")) {
    normalized = `+${normalized.slice(1).replace(/\D/g, "")}`;
  } else {
    normalized = normalized.replace(/\D/g, "");
  }
  if (normalized.replace(/\D/g, "").length < 7) return null;
  return normalized;
};

const normalizePhoneFromId = (value: string | null | undefined) => {
  if (!value) return null;
  const atIndex = value.indexOf("@");
  if (atIndex > 0) {
    const beforeAt = value.slice(0, atIndex);
    const normalized = normalizePhone(beforeAt);
    if (normalized) return normalized;
  }
  return normalizePhone(value);
};

const extractTextCandidates = (root: Element | null) => {
  if (!root) return [];
  const candidates = new Set<string>();
  const addCandidate = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (ignoredPresence.has(lower)) return;
    candidates.add(trimmed);
  };

  addCandidate(root.getAttribute("title"));
  addCandidate(root.getAttribute("aria-label"));
  root.querySelectorAll("span").forEach((span) => addCandidate(span.textContent));
  root.querySelectorAll<HTMLElement>("[title],[aria-label]").forEach((node) => {
    addCandidate(node.getAttribute("title"));
    addCandidate(node.getAttribute("aria-label"));
  });

  return Array.from(candidates);
};

const extractAttributeCandidates = (root: Element | null, attributes: string[]) => {
  if (!root) return [];
  const candidates = new Set<string>();
  const addCandidate = (value: string | null) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    candidates.add(trimmed);
  };

  for (const attribute of attributes) {
    addCandidate(root.getAttribute(attribute));
    root.querySelectorAll(`[${attribute}]`).forEach((node) => {
      addCandidate(node.getAttribute(attribute));
    });
  }

  return Array.from(candidates);
};

const pickBestText = (candidates: string[]) => {
  if (!candidates.length) return null;
  return candidates.sort((a, b) => b.length - a.length)[0] || null;
};

function getChatTitle(): string {
  // Strategy:
  // 1) find a header area
  // 2) choose the most prominent text node
  const header = document.querySelector("header");
  const headerTitle = pickBestText(extractTextCandidates(header));
  if (headerTitle) return headerTitle;

  const selectedChat = document.querySelector('[aria-selected="true"]');
  const selectedTitle = pickBestText(extractTextCandidates(selectedChat));
  return selectedTitle || "Unknown";
}

/**
 * Best-effort detection:
 * WhatsApp Web may not provide phone numbers in DOM reliably.
 * Treat phoneE164 as optional.
 */
function getPhoneE164BestEffort(): string | null {
  const header = document.querySelector("header");
  const selectedChat = document.querySelector('[aria-selected="true"]');
  const attributeNames = ["data-id", "data-chat-id", "data-user-id", "id", "title", "aria-label"];
  const candidateSources = [
    ...extractTextCandidates(header),
    ...extractTextCandidates(selectedChat),
    ...extractAttributeCandidates(header, attributeNames),
    ...extractAttributeCandidates(selectedChat, attributeNames),
  ];

  for (const candidate of candidateSources) {
    const normalized = normalizePhoneFromId(candidate);
    if (normalized) return normalized;
  }

  const telLink = document.querySelector("a[href^='tel:']") as HTMLAnchorElement | null;
  const telValue = telLink?.getAttribute("href")?.replace(/^tel:/i, "");
  const telPhone = normalizePhone(telValue);
  if (telPhone) return telPhone;

  const dataId =
    selectedChat?.getAttribute("data-id") ||
    header?.getAttribute("data-id") ||
    selectedChat?.closest("[data-id]")?.getAttribute("data-id") ||
    selectedChat?.querySelector("[data-id]")?.getAttribute("data-id") ||
    header?.querySelector("[data-id]")?.getAttribute("data-id");
  const dataIdPhone = normalizePhoneFromId(dataId);
  if (dataIdPhone) return dataIdPhone;

  try {
    const url = new URL(location.href);
    const phoneParam = normalizePhone(url.searchParams.get("phone"));
    if (phoneParam) return phoneParam;
  } catch {
    return null;
  }

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
