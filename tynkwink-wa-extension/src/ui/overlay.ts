type OverlayOpts = {
  onSync: () => Promise<any>;
  onCheckAuth: () => Promise<any>;
  onLogin: (payload: { email: string; password: string; tenantId?: string | null }) => Promise<any>;
  onGetSummary: () => Promise<any>;
  onGetChatSnapshot: () => { name: string | null; phone: string | null };
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export function mountOverlay(opts: OverlayOpts) {
  const id = "tw-wa-overlay-root";
  if (document.getElementById(id)) return;

  document.documentElement.classList.add("tw-wa-overlay-active");
  if (document.body) {
    document.body.classList.add("tw-wa-overlay-active");
  }

  const root = el("div");
  root.id = id;
  root.style.position = "fixed";
  root.style.inset = "0";
  root.style.zIndex = "999999";
  root.style.pointerEvents = "none";
  root.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";

  root.innerHTML = `
    <style>
      :root {
        --tw-wa-panel-width: 360px;
        --tw-wa-topbar-height: 54px;
        --tw-wa-pipeline-height: 52px;
      }
      @media (max-width: 1280px) {
        :root {
          --tw-wa-panel-width: 320px;
        }
      }
      #tw-wa-overlay-root {
        --tw-wa-app-left: 0px;
        --tw-wa-app-top: 0px;
        --tw-wa-app-right: 0px;
        --tw-wa-app-bottom: 0px;
        --tw-wa-app-width: 100vw;
        --tw-wa-app-height: 100vh;
        --tw-wa-panel-effective-width: var(--tw-wa-panel-width);
      }
      .tw-wa-topbar {
        position: fixed;
        top: var(--tw-wa-app-top);
        left: var(--tw-wa-app-left);
        right: var(--tw-wa-app-right);
        height: var(--tw-wa-topbar-height);
        background: linear-gradient(180deg, #111, #1b1b1b);
        border-bottom: 1px solid rgba(255,255,255,0.08);
        display: flex;
        align-items: center;
        padding: 0 16px;
        gap: 18px;
        color: #e6f0ff;
        pointer-events: auto;
      }
      .tw-wa-logo {
        font-weight: 800;
        letter-spacing: 0.4px;
        color: #5cc1ff;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .tw-wa-nav {
        display: flex;
        gap: 12px;
        font-size: 13px;
        align-items: center;
        color: #9fd3ff;
      }
      .tw-wa-nav span {
        opacity: 0.9;
        cursor: pointer;
      }
      .tw-wa-actions {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .tw-wa-pill {
        border: 1px solid rgba(96, 181, 255, 0.6);
        color: #e3f1ff;
        padding: 6px 12px;
        border-radius: 999px;
        font-size: 12px;
        background: rgba(10, 27, 41, 0.6);
        cursor: pointer;
      }
      .tw-wa-auth-status {
        font-size: 12px;
        color: #9ac7ff;
      }
      .tw-wa-pipeline {
        position: fixed;
        top: calc(var(--tw-wa-app-top) + var(--tw-wa-topbar-height));
        left: var(--tw-wa-app-left);
        right: calc(var(--tw-wa-panel-effective-width) + var(--tw-wa-app-right));
        height: var(--tw-wa-pipeline-height);
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
        padding: 6px 10px;
        background: #121212;
        pointer-events: auto;
      }
      .tw-wa-stage {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: #fff;
        font-size: 12px;
        border-radius: 10px;
        position: relative;
        padding: 6px 0;
      }
      .tw-wa-stage strong {
        font-size: 16px;
      }
      .tw-wa-panel {
        position: fixed;
        top: calc(var(--tw-wa-app-top) + var(--tw-wa-topbar-height));
        right: var(--tw-wa-app-right);
        width: var(--tw-wa-panel-effective-width);
        bottom: var(--tw-wa-app-bottom);
        background: #151515;
        border-left: 1px solid rgba(255,255,255,0.08);
        color: #e9f2ff;
        display: flex;
        flex-direction: column;
        pointer-events: auto;
      }
      .tw-wa-panel-tabs {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        border-bottom: 1px solid rgba(255,255,255,0.08);
        background: #101214;
      }
      .tw-wa-tab {
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #9aa7b6;
        border: none;
        background: transparent;
        cursor: pointer;
        position: relative;
      }
      .tw-wa-tab svg {
        width: 20px;
        height: 20px;
        fill: currentColor;
      }
      .tw-wa-tab.is-active {
        color: #5cc1ff;
      }
      .tw-wa-tab.is-active::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: #2a8bf2;
      }
      .tw-wa-panel-body {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 18px;
        overflow-y: auto;
        height: 100%;
      }
      .tw-wa-tab-panel {
        display: none;
        flex-direction: column;
        gap: 16px;
      }
      .tw-wa-tab-panel.is-active {
        display: flex;
      }
      .tw-wa-section {
        background: #131516;
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 12px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .tw-wa-section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 15px;
        font-weight: 600;
        color: #f1f5ff;
      }
      .tw-wa-section-header button {
        background: transparent;
        border: none;
        color: #7da9ff;
        cursor: pointer;
      }
      .tw-wa-field {
        display: grid;
        grid-template-columns: 90px 1fr;
        gap: 10px;
        align-items: center;
        font-size: 12px;
        color: #9aa7b6;
      }
      .tw-wa-field label {
        color: #e0e6f0;
      }
      .tw-wa-input,
      .tw-wa-select,
      .tw-wa-textarea {
        background: #1b1f24;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        padding: 8px 10px;
        color: #f3f7ff;
        font-size: 13px;
        width: 100%;
      }
      .tw-wa-textarea {
        min-height: 90px;
        resize: vertical;
      }
      .tw-wa-input[readonly] {
        opacity: 0.85;
      }
      .tw-wa-inline {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .tw-wa-switch {
        position: relative;
        width: 44px;
        height: 24px;
      }
      .tw-wa-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .tw-wa-slider {
        position: absolute;
        inset: 0;
        background: #2b3138;
        border-radius: 999px;
        transition: 0.2s ease;
      }
      .tw-wa-slider::before {
        content: "";
        position: absolute;
        height: 18px;
        width: 18px;
        left: 3px;
        top: 3px;
        background: #cbd5f5;
        border-radius: 999px;
        transition: 0.2s ease;
      }
      .tw-wa-switch input:checked + .tw-wa-slider {
        background: #17a861;
      }
      .tw-wa-switch input:checked + .tw-wa-slider::before {
        transform: translateX(20px);
        background: #fff;
      }
      .tw-wa-link {
        color: #4aa3ff;
        font-size: 12px;
        cursor: pointer;
      }
      .tw-wa-divider {
        height: 1px;
        background: rgba(255,255,255,0.08);
      }
      .tw-wa-sync {
        width: 100%;
        background: #1c5aa6;
        border: none;
        color: #fff;
        padding: 10px 12px;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
      }
      .tw-wa-log {
        background: #101214;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        padding: 10px;
        font-size: 11px;
        max-height: 140px;
        overflow: auto;
        white-space: pre-wrap;
        color: #a4b0c0;
      }
      .tw-wa-quick-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .tw-wa-btn-secondary {
        border: 1px solid rgba(70, 130, 255, 0.6);
        background: transparent;
        color: #7da9ff;
        padding: 6px 10px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
      }
      .tw-wa-reminder-list,
      .tw-wa-quick-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .tw-wa-reminder-item,
      .tw-wa-quick-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        background: #181c21;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.06);
      }
      .tw-wa-reminder-item label {
        flex: 1;
        color: #e1e7f4;
        font-size: 13px;
      }
      .tw-wa-count-pill {
        background: #1f2937;
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 12px;
        color: #8fa3bf;
      }
      .tw-wa-empty {
        font-size: 12px;
        color: #8a97ab;
        padding: 8px 0;
      }
      .tw-wa-collapsible-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: pointer;
        border: none;
        background: transparent;
        color: inherit;
        padding: 0;
      }
      .tw-wa-collapsible-toggle svg {
        width: 16px;
        height: 16px;
        transition: transform 0.2s ease;
      }
      .tw-wa-collapsible-toggle[aria-expanded="false"] svg {
        transform: rotate(-90deg);
      }
      .tw-wa-collapsible-content {
        display: none;
        flex-direction: column;
        gap: 10px;
      }
      .tw-wa-collapsible-content.is-open {
        display: flex;
      }
      .tw-wa-modal {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.72);
        display: none;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
      }
      .tw-wa-modal.is-visible {
        display: flex;
      }
      .tw-wa-modal-card {
        width: 420px;
        background: #141516;
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        padding: 22px;
        color: #f4f7ff;
        box-shadow: 0 24px 60px rgba(0,0,0,0.4);
        position: relative;
      }
      .tw-wa-modal-card h2 {
        margin: 8px 0 4px;
        text-align: center;
      }
      .tw-wa-modal-card p {
        margin: 0 0 16px;
        text-align: center;
        color: #a4b0c0;
        font-size: 13px;
      }
      .tw-wa-modal-field {
        margin-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 12px;
        color: #9aa7b6;
      }
      .tw-wa-modal-actions {
        margin-top: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .tw-wa-modal-actions button {
        padding: 10px 12px;
        border-radius: 10px;
        border: none;
        cursor: pointer;
        font-weight: 600;
      }
      .tw-wa-primary {
        background: #1c5aa6;
        color: #fff;
      }
      .tw-wa-link-alt {
        background: transparent;
        color: #4aa3ff;
        border: none;
        text-decoration: underline;
        cursor: pointer;
      }
      .tw-wa-modal-status {
        margin-top: 10px;
        font-size: 12px;
        color: #9ac7ff;
        text-align: center;
      }
      .tw-wa-close {
        position: absolute;
        top: 14px;
        right: 16px;
        background: transparent;
        border: none;
        color: #fff;
        font-size: 18px;
        cursor: pointer;
      }
    </style>
    <div class="tw-wa-topbar">
      <div class="tw-wa-logo">Tynkwink CRM</div>
      <div class="tw-wa-nav">
        <span data-role="nav-all">All Chats (—)</span>
        <span data-role="nav-unread">Unread Chats (—)</span>
        <span data-role="nav-needs-reply">Needs Reply (—)</span>
        <span data-role="nav-groups">Groups (—)</span>
        <span data-role="nav-reminders">Pending Reminders (—)</span>
      </div>
      <div class="tw-wa-actions">
        <span class="tw-wa-auth-status">Checking CRM login...</span>
        <button class="tw-wa-pill" data-action="login">Login</button>
        <button class="tw-wa-pill" data-action="sync">Sync Chat</button>
      </div>
    </div>
    <div class="tw-wa-pipeline" data-role="pipeline"></div>
    <div class="tw-wa-panel">
      <div class="tw-wa-panel-tabs" role="tablist">
        <button class="tw-wa-tab is-active" data-tab="personal" role="tab" aria-selected="true">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"/></svg>
        </button>
        <button class="tw-wa-tab" data-tab="call" role="tab" aria-selected="false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1v3.5c0 .55-.45 1-1 1C10.07 21.51 2.5 13.94 2.5 4.5c0-.55.45-1 1-1H7c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.7 2.7z"/></svg>
        </button>
        <button class="tw-wa-tab" data-tab="quick" role="tab" aria-selected="false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v14l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        </button>
        <button class="tw-wa-tab" data-tab="assistant" role="tab" aria-selected="false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 00-7 7v5H4a2 2 0 00-2 2v2a2 2 0 002 2h2v-9a6 6 0 0112 0v9h2a2 2 0 002-2v-2a2 2 0 00-2-2h-1V9a7 7 0 00-7-7z"/></svg>
        </button>
      </div>
      <div class="tw-wa-panel-body">
        <section class="tw-wa-tab-panel is-active" data-panel="personal">
          <div class="tw-wa-section">
            <div class="tw-wa-section-header">
              <span>Personal Info</span>
              <button type="button" title="Edit">✎</button>
            </div>
            <div class="tw-wa-field">
              <label>Name</label>
              <input class="tw-wa-input" data-role="contact-name" placeholder="Lead name" />
            </div>
            <div class="tw-wa-field">
              <label>Phone</label>
              <div class="tw-wa-inline">
                <input class="tw-wa-input" data-role="contact-phone" placeholder="Phone number" />
                <button class="tw-wa-btn-secondary" data-action="copy-phone">Copy</button>
              </div>
            </div>
            <div class="tw-wa-field">
              <label>AI Auto-Reply</label>
              <div class="tw-wa-inline" style="justify-content:space-between;">
                <span data-role="ai-label">(Global Switch: --)</span>
                <label class="tw-wa-switch">
                  <input type="checkbox" data-role="ai-toggle" disabled />
                  <span class="tw-wa-slider"></span>
                </label>
              </div>
            </div>
            <div class="tw-wa-field">
              <label>Pipeline</label>
              <input class="tw-wa-input" data-role="pipeline-name" readonly />
            </div>
            <div class="tw-wa-field">
              <label>Stage</label>
              <select class="tw-wa-select" data-role="stage-select"></select>
            </div>
            <div class="tw-wa-field">
              <label>Sequence</label>
              <span class="tw-wa-link" data-role="sequence">No Sequence</span>
            </div>
            <div class="tw-wa-field">
              <label>Source</label>
              <input class="tw-wa-input" data-role="source-name" readonly />
            </div>
          </div>
          <div class="tw-wa-section">
            <button class="tw-wa-collapsible-toggle" data-action="toggle-additional" aria-expanded="false">
              <span class="tw-wa-section-header">Additional Info</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
            </button>
            <div class="tw-wa-collapsible-content" data-role="additional-content">
              <div class="tw-wa-field">
                <label>Email</label>
                <input class="tw-wa-input" data-role="contact-email" placeholder="Enter the Email" />
              </div>
              <div class="tw-wa-field">
                <label>Company</label>
                <input class="tw-wa-input" data-role="contact-company" placeholder="Company" />
              </div>
              <div class="tw-wa-field">
                <label>Created</label>
                <input class="tw-wa-input" data-role="contact-created" readonly />
              </div>
              <button class="tw-wa-btn-secondary" type="button">+ Add New Attribute</button>
            </div>
          </div>
          <div class="tw-wa-section">
            <button class="tw-wa-collapsible-toggle" data-action="toggle-activity" aria-expanded="true">
              <span class="tw-wa-section-header">Activity History</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
            </button>
            <div class="tw-wa-collapsible-content is-open" data-role="activity-content">
              <label class="tw-wa-field" style="grid-template-columns:1fr; gap:6px;">
                <span style="color:#9aa7b6;">Notes</span>
                <textarea class="tw-wa-textarea" placeholder="Take a note for this chat."></textarea>
              </label>
            </div>
          </div>
          <div class="tw-wa-log" data-role="log"></div>
          <button class="tw-wa-sync" data-action="sync">Import lead to Tynkwink CRM</button>
        </section>

        <section class="tw-wa-tab-panel" data-panel="call">
          <div class="tw-wa-section">
            <div class="tw-wa-section-header">
              <span>Call Tracker</span>
              <button class="tw-wa-btn-secondary" type="button">Add Reminder</button>
            </div>
            <div class="tw-wa-reminder-list" data-role="reminder-list"></div>
          </div>
        </section>

        <section class="tw-wa-tab-panel" data-panel="quick">
          <div class="tw-wa-section">
            <div class="tw-wa-quick-actions">
              <span class="tw-wa-section-header">Quick Replies</span>
              <button class="tw-wa-btn-secondary" type="button">+ Add a Quick Reply</button>
            </div>
            <div class="tw-wa-quick-list" data-role="quick-list"></div>
          </div>
        </section>

        <section class="tw-wa-tab-panel" data-panel="assistant">
          <div class="tw-wa-section">
            <div class="tw-wa-section-header">
              <span>AI Assistant</span>
            </div>
            <div class="tw-wa-empty">Coming soon: AI suggestions based on your Tynkwink CRM history.</div>
          </div>
        </section>
      </div>
    </div>
    <div class="tw-wa-modal" data-role="modal">
      <div class="tw-wa-modal-card">
        <button class="tw-wa-close" data-action="close">✕</button>
        <div class="tw-wa-logo" style="justify-content:center; font-size:20px;">Tynkwink</div>
        <h2>Login</h2>
        <p>Sign in to Tynkwink CRM to fetch your extension credentials automatically.</p>
        <form data-role="login-form">
          <div class="tw-wa-modal-field">
            <label>Email</label>
            <input class="tw-wa-input" type="email" name="email" placeholder="Enter your email" required />
          </div>
          <div class="tw-wa-modal-field">
            <label>Password</label>
            <input class="tw-wa-input" type="password" name="password" placeholder="Enter your password" required />
          </div>
          <div class="tw-wa-modal-field" data-role="tenant-field">
            <label>Tenant ID (optional)</label>
            <input class="tw-wa-input" type="text" name="tenantId" placeholder="workspace id or slug" data-role="tenant-input" />
            <select class="tw-wa-input" name="tenantId" data-role="tenant-select" style="display:none;"></select>
          </div>
          <div class="tw-wa-modal-actions">
            <button class="tw-wa-primary" type="submit">Get Access</button>
            <button class="tw-wa-link-alt" type="button">Forgot Password?</button>
          </div>
          <div class="tw-wa-modal-status" data-role="modal-status"></div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(root);

  const authStatus = root.querySelector(".tw-wa-auth-status") as HTMLSpanElement;
  const navAll = root.querySelector('[data-role="nav-all"]') as HTMLSpanElement;
  const navUnread = root.querySelector('[data-role="nav-unread"]') as HTMLSpanElement;
  const navNeedsReply = root.querySelector('[data-role="nav-needs-reply"]') as HTMLSpanElement;
  const navGroups = root.querySelector('[data-role="nav-groups"]') as HTMLSpanElement;
  const navReminders = root.querySelector('[data-role="nav-reminders"]') as HTMLSpanElement;
  const pipelineContainer = root.querySelector('[data-role="pipeline"]') as HTMLDivElement;
  const contactName = root.querySelector('[data-role="contact-name"]') as HTMLInputElement;
  const contactPhone = root.querySelector('[data-role="contact-phone"]') as HTMLInputElement;
  const contactEmail = root.querySelector('[data-role="contact-email"]') as HTMLInputElement;
  const contactCompany = root.querySelector('[data-role="contact-company"]') as HTMLInputElement;
  const contactCreated = root.querySelector('[data-role="contact-created"]') as HTMLInputElement;
  const aiLabel = root.querySelector('[data-role="ai-label"]') as HTMLSpanElement;
  const aiToggle = root.querySelector('[data-role="ai-toggle"]') as HTMLInputElement;
  const pipelineName = root.querySelector('[data-role="pipeline-name"]') as HTMLInputElement;
  const stageSelect = root.querySelector('[data-role="stage-select"]') as HTMLSelectElement;
  const sequenceLabel = root.querySelector('[data-role="sequence"]') as HTMLSpanElement;
  const sourceName = root.querySelector('[data-role="source-name"]') as HTMLInputElement;
  const modal = root.querySelector('[data-role="modal"]') as HTMLDivElement;
  const modalStatus = root.querySelector('[data-role="modal-status"]') as HTMLDivElement;
  const tenantField = root.querySelector('[data-role="tenant-field"]') as HTMLDivElement;
  const tenantInput = tenantField.querySelector('[data-role="tenant-input"]') as HTMLInputElement;
  const tenantSelect = tenantField.querySelector('[data-role="tenant-select"]') as HTMLSelectElement;
  const loginForm = root.querySelector('[data-role="login-form"]') as HTMLFormElement;
  const log = root.querySelector('[data-role="log"]') as HTMLDivElement;
  const loginBtn = root.querySelector('[data-action="login"]') as HTMLButtonElement;
  const closeBtn = root.querySelector('[data-action="close"]') as HTMLButtonElement;
  const syncButtons = root.querySelectorAll('[data-action="sync"]');
  const tabButtons = Array.from(root.querySelectorAll('[data-tab]')) as HTMLButtonElement[];
  const tabPanels = Array.from(root.querySelectorAll('[data-panel]')) as HTMLElement[];
  const additionalToggle = root.querySelector('[data-action="toggle-additional"]') as HTMLButtonElement;
  const additionalContent = root.querySelector('[data-role="additional-content"]') as HTMLDivElement;
  const activityToggle = root.querySelector('[data-action="toggle-activity"]') as HTMLButtonElement;
  const activityContent = root.querySelector('[data-role="activity-content"]') as HTMLDivElement;
  const reminderList = root.querySelector('[data-role="reminder-list"]') as HTMLDivElement;
  const quickList = root.querySelector('[data-role="quick-list"]') as HTMLDivElement;
  const copyPhoneButton = root.querySelector('[data-action="copy-phone"]') as HTMLButtonElement;

  let isLoggingIn = false;
  let isLoadingSummary = false;

  let lastSnapshot: { name: string | null; phone: string | null } = { name: null, phone: null };
  let headerObserver: MutationObserver | null = null;
  let observedHeader: HTMLElement | null = null;

  const getPanelWidth = () => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--tw-wa-panel-width");
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 360;
  };

  const updateOverlayBounds = () => {
    const appRoot = document.querySelector("#app") as HTMLElement | null;
    const rect = appRoot?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
      width: window.innerWidth,
      height: window.innerHeight,
    };
    const panelWidth = Math.min(rect.width || window.innerWidth, getPanelWidth());
    root.style.setProperty("--tw-wa-app-left", `${rect.left}px`);
    root.style.setProperty("--tw-wa-app-top", `${rect.top}px`);
    root.style.setProperty("--tw-wa-app-right", `${Math.max(0, window.innerWidth - rect.right)}px`);
    root.style.setProperty("--tw-wa-app-bottom", `${Math.max(0, window.innerHeight - rect.bottom)}px`);
    root.style.setProperty("--tw-wa-app-width", `${rect.width || window.innerWidth}px`);
    root.style.setProperty("--tw-wa-app-height", `${rect.height || window.innerHeight}px`);
    root.style.setProperty("--tw-wa-panel-effective-width", `${panelWidth}px`);
  };

  const updateChatSnapshot = () => {
    const snapshot = opts.onGetChatSnapshot();
    const nextName = snapshot?.name || null;
    const nextPhone = snapshot?.phone || null;
    if (nextName === lastSnapshot.name && nextPhone === lastSnapshot.phone) return;
    lastSnapshot = { name: nextName, phone: nextPhone };
    contactName.value = nextName || "";
    contactPhone.value = nextPhone || "";
    contactCreated.value = new Date().toLocaleString();
  };

  const ensureHeaderObserver = () => {
    const header = document.querySelector("header") as HTMLElement | null;
    if (!header || header === observedHeader) return;
    headerObserver?.disconnect();
    observedHeader = header;
    headerObserver = new MutationObserver(() => updateChatSnapshot());
    headerObserver.observe(header, { subtree: true, childList: true, characterData: true });
    updateChatSnapshot();
  };

  const setTab = (tabId: string) => {
    tabButtons.forEach((button) => {
      const isActive = button.dataset.tab === tabId;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
    tabPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.panel === tabId);
    });
  };

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setTab(button.dataset.tab || "personal");
    });
  });

  const toggleCollapsible = (toggle: HTMLButtonElement, content: HTMLElement) => {
    const isExpanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isExpanded));
    content.classList.toggle("is-open", !isExpanded);
  };

  additionalToggle.addEventListener("click", () => toggleCollapsible(additionalToggle, additionalContent));
  activityToggle.addEventListener("click", () => toggleCollapsible(activityToggle, activityContent));

  copyPhoneButton.addEventListener("click", async () => {
    if (!contactPhone.value) return;
    try {
      await navigator.clipboard.writeText(contactPhone.value);
      copyPhoneButton.textContent = "Copied";
      setTimeout(() => {
        copyPhoneButton.textContent = "Copy";
      }, 1200);
    } catch {
      copyPhoneButton.textContent = "Unable";
    }
  });

  const setEmptyList = (container: HTMLElement, message: string) => {
    container.innerHTML = `<div class="tw-wa-empty">${message}</div>`;
  };

  const updateSummary = (summary: any) => {
    if (!summary) return;
    navAll.textContent = `All Chats (${summary.stats?.allChats ?? 0})`;
    navUnread.textContent = `Unread Chats (${summary.stats?.unreadChats ?? 0})`;
    navNeedsReply.textContent = `Needs Reply (${summary.stats?.needsReply ?? 0})`;
    navGroups.textContent = `Groups (${summary.stats?.groups ?? 0})`;
    navReminders.textContent = `Pending Reminders (${summary.stats?.pendingReminders ?? 0})`;

    pipelineName.value = summary.pipeline?.name ?? "Leads";
    const defaultStage =
      summary.pipeline?.stages?.find((stage: any) => stage.id === summary.pipeline?.defaultStageId) ??
      summary.pipeline?.stages?.[0];

    stageSelect.innerHTML = "";
    (summary.pipeline?.stages ?? []).forEach((stage: any) => {
      const option = document.createElement("option");
      option.value = stage.id;
      option.textContent = stage.name ?? "Stage";
      stageSelect.appendChild(option);
    });
    if (defaultStage?.id) {
      stageSelect.value = defaultStage.id;
    }

    const isAiEnabled = Boolean(summary.features?.aiAutoReplyEnabled);
    aiToggle.checked = isAiEnabled;
    aiLabel.textContent = `(Global Switch: ${isAiEnabled ? "on" : "off"})`;

    sourceName.value = "Extension";
    contactEmail.value = summary.user?.email ?? contactEmail.value;

    pipelineContainer.innerHTML = "";
    const stages = summary.pipeline?.stages ?? [];
    stages.forEach((stage: any) => {
      const stageEl = document.createElement("div");
      stageEl.className = "tw-wa-stage";
      stageEl.style.background = stage.color || "#64748b";
      stageEl.innerHTML = `<strong>${stage.count ?? 0}</strong><span>${stage.name ?? "Stage"}</span>`;
      pipelineContainer.appendChild(stageEl);
    });

    const reminders = summary.reminders ?? [];
    reminderList.innerHTML = "";
    if (reminders.length === 0) {
      setEmptyList(reminderList, "No reminders yet.");
    } else {
      reminders.forEach((reminder: any) => {
        const item = document.createElement("div");
        item.className = "tw-wa-reminder-item";
        item.innerHTML = `
          <input type="checkbox" ${reminder?.done ? "checked" : ""} />
          <label>${reminder?.title ?? "Reminder"}</label>
        `;
        reminderList.appendChild(item);
      });
    }

    const quickReplies = summary.quickReplies ?? [];
    quickList.innerHTML = "";
    if (quickReplies.length === 0) {
      setEmptyList(quickList, "No quick replies configured.");
    } else {
      quickReplies.forEach((reply: any) => {
        const item = document.createElement("div");
        item.className = "tw-wa-quick-item";
        item.innerHTML = `
          <span>${reply?.title ?? "Quick Reply"}</span>
          <span class="tw-wa-count-pill">${reply?.count ?? 0}</span>
        `;
        quickList.appendChild(item);
      });
    }

    const canSync = Boolean(summary.permissions?.canSync);
    syncButtons.forEach((button) => {
      const btn = button as HTMLButtonElement;
      btn.disabled = !canSync;
      btn.title = canSync ? "" : "You do not have permission to sync.";
    });
  };

  const refreshSummary = async () => {
    if (isLoadingSummary) return;
    isLoadingSummary = true;
    log.textContent = "Loading CRM summary...";
    try {
      const res = await opts.onGetSummary();
      if (!res?.ok) {
        log.textContent = res?.error || "Unable to load CRM summary.";
        return;
      }
      updateSummary(res?.summary);
      log.textContent = "CRM summary synced.";
    } finally {
      isLoadingSummary = false;
    }
  };

  const openModal = () => {
    modal.classList.add("is-visible");
  };
  const closeModal = () => {
    modal.classList.remove("is-visible");
  };

  loginBtn.onclick = () => openModal();
  closeBtn.onclick = () => closeModal();

  const setAuthState = (token: string | null) => {
    if (token) {
      authStatus.textContent = "CRM Connected";
      loginBtn.textContent = "Connected";
      loginBtn.disabled = true;
      closeModal();
    } else {
      authStatus.textContent = "Action needed: Log in to CRM";
      loginBtn.textContent = "Login";
      loginBtn.disabled = false;
      openModal();
    }
  };

  (async () => {
    ensureHeaderObserver();
    updateOverlayBounds();
    window.addEventListener("resize", updateOverlayBounds);
    setInterval(() => {
      ensureHeaderObserver();
      updateOverlayBounds();
    }, 1000);
    const res = await opts.onCheckAuth();
    const token = res?.auth?.token ?? null;
    setAuthState(token);
    if (token) {
      await refreshSummary();
    }
  })();

  loginForm.onsubmit = async (event) => {
    event.preventDefault();
    if (isLoggingIn) return;
    modalStatus.textContent = "Signing in...";
    isLoggingIn = true;
    loginBtn.disabled = true;
    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();
    const tenantId = (tenantSelect.style.display === "none" ? tenantInput.value : tenantSelect.value) || "";
    const normalizedTenantId = tenantId.trim() || null;

    const res = await opts.onLogin({ email, password, tenantId: normalizedTenantId });
    if (!res?.ok) {
      modalStatus.textContent = res?.error || "Login failed.";
      isLoggingIn = false;
      loginBtn.disabled = false;
      return;
    }

    if (res?.requiresTenantSelection) {
      const tenants = res.tenants || [];
      if (tenants.length === 1) {
        const followUp = await opts.onLogin({ email, password, tenantId: tenants[0].tenantId });
        if (!followUp?.ok) {
          modalStatus.textContent = followUp?.error || "Login failed.";
          isLoggingIn = false;
          loginBtn.disabled = false;
          return;
        }
        modalStatus.textContent = "Login successful. Credentials synced.";
        setAuthState(followUp?.auth?.token ?? null);
        await refreshSummary();
        isLoggingIn = false;
        loginBtn.disabled = false;
        return;
      }
      tenantInput.style.display = "none";
      tenantSelect.style.display = "block";
      tenantSelect.innerHTML = "";
      for (const tenant of tenants) {
        const option = document.createElement("option");
        option.value = tenant.tenantId;
        option.textContent = `${tenant.tenantName} (${tenant.role})`;
        tenantSelect.appendChild(option);
      }
      tenantSelect.value = tenantSelect.options[0]?.value ?? "";
      modalStatus.textContent = "Select a tenant to continue.";
      isLoggingIn = false;
      loginBtn.disabled = false;
      return;
    }

    modalStatus.textContent = "Login successful. Credentials synced.";
    setAuthState(res?.auth?.token ?? null);
    await refreshSummary();
    isLoggingIn = false;
    loginBtn.disabled = false;
  };

  syncButtons.forEach((button) => {
    (button as HTMLButtonElement).onclick = async () => {
      log.textContent = "Syncing current chat...";
      try {
        const res = await opts.onSync();
        log.textContent = JSON.stringify(res, null, 2);
        await refreshSummary();
      } catch (error: any) {
        log.textContent = `Sync failed: ${error?.message || "unknown error"}`;
      }
    };
  });
}
