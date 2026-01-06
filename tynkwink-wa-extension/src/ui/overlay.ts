type OverlayOpts = {
  onSync: () => Promise<any>;
  onCheckAuth: () => Promise<any>;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export function mountOverlay(opts: OverlayOpts) {
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
  close.textContent = "✕";
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
    } catch (e: any) {
      log.textContent = `Error: ${e?.message || "unknown"}`;
    }
  };
}
