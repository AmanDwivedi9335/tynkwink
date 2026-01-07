// src/ui/overlay.ts
function el(tag, attrs = {}) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}
function mountOverlay(opts) {
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
      body.tw-wa-overlay-active {
        padding-top: calc(var(--tw-wa-topbar-height) + var(--tw-wa-pipeline-height));
        padding-right: var(--tw-wa-panel-effective-width);
        box-sizing: border-box;
      }
      body.tw-wa-overlay-active.tw-wa-panel-collapsed {
        padding-right: 0;
      }
      body.tw-wa-overlay-active header {
        top: calc(var(--tw-wa-topbar-height) + var(--tw-wa-pipeline-height));
      }
      body.tw-wa-overlay-active main {
        top: calc(var(--tw-wa-topbar-height) + var(--tw-wa-pipeline-height));
        height: calc(100% - var(--tw-wa-topbar-height) - var(--tw-wa-pipeline-height));
      }
      body.tw-wa-overlay-active #app {
        min-height: calc(100vh - var(--tw-wa-topbar-height) - var(--tw-wa-pipeline-height));
        box-sizing: border-box;
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
      .tw-wa-icon-button {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(18, 22, 30, 0.7);
        color: #9fd3ff;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .tw-wa-icon-button svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
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
        transition: transform 0.25s ease;
      }
      #tw-wa-overlay-root.tw-wa-panel-collapsed .tw-wa-panel {
        transform: translateX(100%);
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
      .tw-wa-field.tw-wa-field-stack {
        grid-template-columns: 1fr;
        gap: 8px;
        align-items: start;
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
      .tw-wa-btn-primary {
        border: none;
        background: #1c5aa6;
        color: #fff;
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
      }
      .tw-wa-btn-primary[disabled],
      .tw-wa-btn-secondary[disabled] {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .tw-wa-lead-status {
        background: rgba(17, 20, 25, 0.7);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .tw-wa-lead-status-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        color: #e0e6f0;
      }
      .tw-wa-status-pill {
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(59, 130, 246, 0.15);
        color: #93c5fd;
        border: 1px solid rgba(59, 130, 246, 0.4);
      }
      .tw-wa-status-pill.is-success {
        background: rgba(22, 163, 74, 0.15);
        color: #86efac;
        border-color: rgba(22, 163, 74, 0.5);
      }
      .tw-wa-status-pill.is-warning {
        background: rgba(234, 179, 8, 0.15);
        color: #fde68a;
        border-color: rgba(234, 179, 8, 0.5);
      }
      .tw-wa-status-body {
        font-size: 12px;
        color: #b3bfce;
        line-height: 1.4;
      }
      .tw-wa-status-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
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
        <span data-role="nav-all">All Chats (\u2014)</span>
        <span data-role="nav-unread">Unread Chats (\u2014)</span>
        <span data-role="nav-needs-reply">Needs Reply (\u2014)</span>
        <span data-role="nav-groups">Groups (\u2014)</span>
        <span data-role="nav-reminders">Pending Reminders (\u2014)</span>
      </div>
      <div class="tw-wa-actions">
        <button
          class="tw-wa-icon-button"
          type="button"
          data-action="toggle-panel"
          aria-expanded="true"
          title="Toggle panel"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/></svg>
        </button>
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
              <button type="button" title="Edit">\u270E</button>
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
            <div class="tw-wa-field tw-wa-field-stack">
              <div class="tw-wa-lead-status">
                <div class="tw-wa-lead-status-header">
                  <span>Lead Status</span>
                  <span class="tw-wa-status-pill" data-role="lead-status-pill">Checking</span>
                </div>
                <div class="tw-wa-status-body" data-role="lead-status-body">
                  Waiting for chat details...
                </div>
                <div class="tw-wa-status-actions" data-role="lead-status-actions">
                  <button class="tw-wa-btn-primary" type="button" data-action="create-lead">Create Lead</button>
                  <button class="tw-wa-btn-secondary" type="button" data-action="send-inbox">
                    Send to Lead Inbox
                  </button>
                </div>
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
            <button
              class="tw-wa-collapsible-toggle"
              data-action="toggle-additional"
              aria-expanded="false"
              aria-controls="tw-wa-additional-info"
              type="button"
            >
              <span class="tw-wa-section-header">Additional Info</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
            </button>
            <div
              class="tw-wa-collapsible-content"
              data-role="additional-content"
              id="tw-wa-additional-info"
              hidden
            >
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
            <button
              class="tw-wa-collapsible-toggle"
              data-action="toggle-activity"
              aria-expanded="true"
              aria-controls="tw-wa-activity-history"
              type="button"
            >
              <span class="tw-wa-section-header">Activity History</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg>
            </button>
            <div
              class="tw-wa-collapsible-content is-open"
              data-role="activity-content"
              id="tw-wa-activity-history"
            >
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
        <button class="tw-wa-close" data-action="close">\u2715</button>
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
  const authStatus = root.querySelector(".tw-wa-auth-status");
  const navAll = root.querySelector('[data-role="nav-all"]');
  const navUnread = root.querySelector('[data-role="nav-unread"]');
  const navNeedsReply = root.querySelector('[data-role="nav-needs-reply"]');
  const navGroups = root.querySelector('[data-role="nav-groups"]');
  const navReminders = root.querySelector('[data-role="nav-reminders"]');
  const pipelineContainer = root.querySelector('[data-role="pipeline"]');
  const contactName = root.querySelector('[data-role="contact-name"]');
  const contactPhone = root.querySelector('[data-role="contact-phone"]');
  const contactEmail = root.querySelector('[data-role="contact-email"]');
  const contactCompany = root.querySelector('[data-role="contact-company"]');
  const contactCreated = root.querySelector('[data-role="contact-created"]');
  const aiLabel = root.querySelector('[data-role="ai-label"]');
  const aiToggle = root.querySelector('[data-role="ai-toggle"]');
  const pipelineName = root.querySelector('[data-role="pipeline-name"]');
  const stageSelect = root.querySelector('[data-role="stage-select"]');
  const sequenceLabel = root.querySelector('[data-role="sequence"]');
  const sourceName = root.querySelector('[data-role="source-name"]');
  const leadStatusPill = root.querySelector('[data-role="lead-status-pill"]');
  const leadStatusBody = root.querySelector('[data-role="lead-status-body"]');
  const leadStatusActions = root.querySelector('[data-role="lead-status-actions"]');
  const createLeadButton = root.querySelector('[data-action="create-lead"]');
  const sendInboxButton = root.querySelector('[data-action="send-inbox"]');
  const modal = root.querySelector('[data-role="modal"]');
  const modalStatus = root.querySelector('[data-role="modal-status"]');
  const tenantField = root.querySelector('[data-role="tenant-field"]');
  const tenantInput = tenantField.querySelector('[data-role="tenant-input"]');
  const tenantSelect = tenantField.querySelector('[data-role="tenant-select"]');
  const loginForm = root.querySelector('[data-role="login-form"]');
  const log = root.querySelector('[data-role="log"]');
  const loginBtn = root.querySelector('[data-action="login"]');
  const closeBtn = root.querySelector('[data-action="close"]');
  const syncButtons = root.querySelectorAll('[data-action="sync"]');
  const tabButtons = Array.from(root.querySelectorAll("[data-tab]"));
  const tabPanels = Array.from(root.querySelectorAll("[data-panel]"));
  const additionalToggle = root.querySelector('[data-action="toggle-additional"]');
  const additionalContent = root.querySelector('[data-role="additional-content"]');
  const activityToggle = root.querySelector('[data-action="toggle-activity"]');
  const activityContent = root.querySelector('[data-role="activity-content"]');
  const reminderList = root.querySelector('[data-role="reminder-list"]');
  const quickList = root.querySelector('[data-role="quick-list"]');
  const copyPhoneButton = root.querySelector('[data-action="copy-phone"]');
  const panelToggleButton = root.querySelector('[data-action="toggle-panel"]');
  let isLoggingIn = false;
  let isLoadingSummary = false;
  let isPanelCollapsed = false;
  let isCheckingLead = false;
  let lastLeadPhone = null;
  let lastSummaryStages = [];
  let lastSnapshot = { name: null, phone: null };
  let headerObserver = null;
  let observedHeader = null;
  const getPanelWidth = () => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--tw-wa-panel-width");
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 360;
  };
  const updateOverlayBounds = () => {
    const appRoot = document.querySelector("#app");
    const rect = appRoot?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
      width: window.innerWidth,
      height: window.innerHeight
    };
    const panelWidth = isPanelCollapsed ? 0 : Math.min(rect.width || window.innerWidth, getPanelWidth());
    root.style.setProperty("--tw-wa-app-left", `${rect.left}px`);
    root.style.setProperty("--tw-wa-app-top", `${rect.top}px`);
    root.style.setProperty("--tw-wa-app-right", `${Math.max(0, window.innerWidth - rect.right)}px`);
    root.style.setProperty("--tw-wa-app-bottom", `${Math.max(0, window.innerHeight - rect.bottom)}px`);
    root.style.setProperty("--tw-wa-app-width", `${rect.width || window.innerWidth}px`);
    root.style.setProperty("--tw-wa-app-height", `${rect.height || window.innerHeight}px`);
    root.style.setProperty("--tw-wa-panel-effective-width", `${panelWidth}px`);
  };
  const setPanelCollapsed = (collapsed) => {
    isPanelCollapsed = collapsed;
    root.classList.toggle("tw-wa-panel-collapsed", collapsed);
    document.documentElement.classList.toggle("tw-wa-panel-collapsed", collapsed);
    document.body?.classList.toggle("tw-wa-panel-collapsed", collapsed);
    panelToggleButton.setAttribute("aria-expanded", String(!collapsed));
    panelToggleButton.title = collapsed ? "Show panel" : "Hide panel";
    updateOverlayBounds();
  };
  const updateChatSnapshot = () => {
    const snapshot = opts.onGetChatSnapshot();
    const nextName = snapshot?.name || null;
    const nextPhone = snapshot?.phone || null;
    if (nextName === lastSnapshot.name && nextPhone === lastSnapshot.phone) return;
    lastSnapshot = { name: nextName, phone: nextPhone };
    contactName.value = nextName || "";
    contactPhone.value = nextPhone || "";
    contactCreated.value = (/* @__PURE__ */ new Date()).toLocaleString();
    refreshLeadStatus();
  };
  const ensureHeaderObserver = () => {
    const header = document.querySelector("header");
    if (!header || header === observedHeader) return;
    headerObserver?.disconnect();
    observedHeader = header;
    headerObserver = new MutationObserver(() => updateChatSnapshot());
    headerObserver.observe(header, { subtree: true, childList: true, characterData: true });
    updateChatSnapshot();
  };
  const setTab = (tabId) => {
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
  panelToggleButton.addEventListener("click", () => {
    setPanelCollapsed(!isPanelCollapsed);
  });
  const toggleCollapsible = (toggle, content) => {
    const isExpanded = toggle.getAttribute("aria-expanded") === "true";
    const nextExpanded = !isExpanded;
    toggle.setAttribute("aria-expanded", String(nextExpanded));
    content.classList.toggle("is-open", nextExpanded);
    content.toggleAttribute("hidden", !nextExpanded);
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
  contactPhone.addEventListener("change", () => {
    refreshLeadStatus();
  });
  createLeadButton.addEventListener("click", async () => {
    const name = contactName.value.trim() || "WhatsApp Lead";
    const phone = contactPhone.value.trim();
    if (!phone) {
      setLeadStatus({
        status: "error",
        message: "Phone number is required to create a lead.",
        showActions: true
      });
      return;
    }
    createLeadButton.disabled = true;
    sendInboxButton.disabled = true;
    setLeadStatus({ status: "checking", message: "Creating lead in CRM...", showActions: false });
    const payload = {
      name,
      phone,
      email: contactEmail.value.trim() || void 0,
      company: contactCompany.value.trim() || void 0,
      stageId: stageSelect.value || void 0
    };
    const res = await chrome.runtime.sendMessage({ type: "CREATE_LEAD", payload });
    if (!res?.ok) {
      setLeadStatus({
        status: "error",
        message: res?.error || "Unable to create lead.",
        showActions: true
      });
      createLeadButton.disabled = false;
      sendInboxButton.disabled = false;
      return;
    }
    await refreshSummary();
    createLeadButton.disabled = false;
    sendInboxButton.disabled = false;
  });
  sendInboxButton.addEventListener("click", async () => {
    const name = contactName.value.trim() || "WhatsApp Lead";
    const phone = contactPhone.value.trim();
    if (!phone) {
      setLeadStatus({
        status: "error",
        message: "Phone number is required to send to Lead Inbox.",
        showActions: true
      });
      return;
    }
    sendInboxButton.disabled = true;
    createLeadButton.disabled = true;
    setLeadStatus({ status: "checking", message: "Sending to Lead Inbox...", showActions: false });
    const stageName = lastSummaryStages.find((stage) => stage.id === stageSelect.value)?.name;
    const payload = {
      name,
      phone,
      email: contactEmail.value.trim() || void 0,
      company: contactCompany.value.trim() || void 0,
      notes: `WhatsApp chat import for ${name}`,
      preferredStage: stageName
    };
    const res = await chrome.runtime.sendMessage({ type: "CREATE_LEAD_INBOX", payload });
    if (!res?.ok) {
      setLeadStatus({
        status: "error",
        message: res?.error || "Unable to send to Lead Inbox.",
        showActions: true
      });
      sendInboxButton.disabled = false;
      createLeadButton.disabled = false;
      return;
    }
    await refreshSummary();
    sendInboxButton.disabled = false;
    createLeadButton.disabled = false;
  });
  const setEmptyList = (container, message) => {
    container.innerHTML = `<div class="tw-wa-empty">${message}</div>`;
  };
  const setLeadStatus = (params) => {
    leadStatusBody.textContent = params.message;
    leadStatusActions.style.display = params.showActions ? "flex" : "none";
    leadStatusPill.classList.remove("is-success", "is-warning");
    if (params.status === "lead") {
      leadStatusPill.textContent = "In CRM";
      leadStatusPill.classList.add("is-success");
    } else if (params.status === "inbox") {
      leadStatusPill.textContent = "In Lead Inbox";
      leadStatusPill.classList.add("is-warning");
    } else if (params.status === "checking") {
      leadStatusPill.textContent = "Checking";
    } else if (params.status === "none") {
      leadStatusPill.textContent = "Not Found";
    } else if (params.status === "error") {
      leadStatusPill.textContent = "Error";
    } else {
      leadStatusPill.textContent = "Idle";
    }
  };
  const updateContactFields = (payload) => {
    if (payload.name) contactName.value = payload.name;
    if (payload.phone) contactPhone.value = payload.phone;
    if (payload.email) contactEmail.value = payload.email;
    if (payload.company) contactCompany.value = payload.company;
    if (payload.stageId) stageSelect.value = payload.stageId;
  };
  const refreshLeadStatus = async () => {
    const phone = contactPhone.value.trim();
    if (!phone) {
      lastLeadPhone = null;
      setLeadStatus({
        status: "idle",
        message: "Phone number not detected yet. Add it to check CRM status.",
        showActions: false
      });
      return;
    }
    if (isCheckingLead && phone === lastLeadPhone) return;
    isCheckingLead = true;
    lastLeadPhone = phone;
    setLeadStatus({ status: "checking", message: "Checking CRM & Lead Inbox...", showActions: false });
    try {
      const res = await chrome.runtime.sendMessage({
        type: "CONTACT_LOOKUP",
        payload: { phone }
      });
      if (!res?.ok) {
        setLeadStatus({
          status: "error",
          message: res?.error || "Unable to check CRM status.",
          showActions: false
        });
        return;
      }
      const data = res?.data;
      if (data?.status === "lead" && data?.lead) {
        updateContactFields({
          name: data.lead.name,
          phone: data.lead.phone,
          email: data.lead.email,
          company: data.lead.company,
          stageId: data.lead.stage?.id
        });
        const stageLabel = data.lead.stage?.name ? `Stage: ${data.lead.stage.name}` : "Stage assigned";
        setLeadStatus({
          status: "lead",
          message: `Already in Tynkwink CRM \u2022 ${stageLabel}`,
          showActions: false
        });
        return;
      }
      if (data?.status === "inbox" && data?.inbox) {
        updateContactFields({
          name: data.inbox.leadPreview?.name,
          phone: data.inbox.leadPreview?.phone,
          email: data.inbox.leadPreview?.email,
          company: data.inbox.leadPreview?.company
        });
        setLeadStatus({
          status: "inbox",
          message: `Lead Inbox (${data.inbox.status}) \u2022 Awaiting approval`,
          showActions: false
        });
        return;
      }
      setLeadStatus({
        status: "none",
        message: "Not found in CRM or Lead Inbox. Create now or send for approval.",
        showActions: true
      });
    } finally {
      isCheckingLead = false;
    }
  };
  const updateSummary = (summary) => {
    if (!summary) return;
    navAll.textContent = `All Chats (${summary.stats?.allChats ?? 0})`;
    navUnread.textContent = `Unread Chats (${summary.stats?.unreadChats ?? 0})`;
    navNeedsReply.textContent = `Needs Reply (${summary.stats?.needsReply ?? 0})`;
    navGroups.textContent = `Groups (${summary.stats?.groups ?? 0})`;
    navReminders.textContent = `Pending Reminders (${summary.stats?.pendingReminders ?? 0})`;
    pipelineName.value = summary.pipeline?.name ?? "Leads";
    const defaultStage = summary.pipeline?.stages?.find((stage) => stage.id === summary.pipeline?.defaultStageId) ?? summary.pipeline?.stages?.[0];
    stageSelect.innerHTML = "";
    lastSummaryStages = (summary.pipeline?.stages ?? []).map((stage) => ({
      id: stage.id,
      name: stage.name ?? "Stage"
    }));
    lastSummaryStages.forEach((stage) => {
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
    stages.forEach((stage) => {
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
      reminders.forEach((reminder) => {
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
      quickReplies.forEach((reply) => {
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
      const btn = button;
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
      refreshLeadStatus();
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
  const setAuthState = (token) => {
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
    setPanelCollapsed(false);
    window.addEventListener("resize", updateOverlayBounds);
    setInterval(() => {
      ensureHeaderObserver();
      updateOverlayBounds();
    }, 1e3);
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
    button.onclick = async () => {
      log.textContent = "Syncing current chat...";
      try {
        const res = await opts.onSync();
        log.textContent = JSON.stringify(res, null, 2);
        await refreshSummary();
      } catch (error) {
        log.textContent = `Sync failed: ${error?.message || "unknown error"}`;
      }
    };
  });
}

// src/content.ts
var EXTRACTOR_VERSION = "dom-v1";
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
var ignoredPresence = /* @__PURE__ */ new Set(["online", "typing...", "typing\u2026", "last seen"]);
var phonePattern = /(\+?\d[\d\s().-]{6,}\d)/;
var normalizePhone = (value) => {
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
var extractTextCandidates = (root) => {
  if (!root) return [];
  const candidates = /* @__PURE__ */ new Set();
  const addCandidate = (value) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    if (ignoredPresence.has(lower)) return;
    candidates.add(trimmed);
  };
  addCandidate(root.getAttribute("title"));
  addCandidate(root.getAttribute("aria-label"));
  root.querySelectorAll("span").forEach((span) => addCandidate(span.textContent));
  root.querySelectorAll("[title],[aria-label]").forEach((node) => {
    addCandidate(node.getAttribute("title"));
    addCandidate(node.getAttribute("aria-label"));
  });
  return Array.from(candidates);
};
var pickBestText = (candidates) => {
  if (!candidates.length) return null;
  return candidates.sort((a, b) => b.length - a.length)[0] || null;
};
function getChatTitle() {
  const header = document.querySelector("header");
  const headerTitle = pickBestText(extractTextCandidates(header));
  if (headerTitle) return headerTitle;
  const selectedChat = document.querySelector('[aria-selected="true"]');
  const selectedTitle = pickBestText(extractTextCandidates(selectedChat));
  return selectedTitle || "Unknown";
}
function getPhoneE164BestEffort() {
  const header = document.querySelector("header");
  const selectedChat = document.querySelector('[aria-selected="true"]');
  const candidateSources = [
    ...extractTextCandidates(header),
    ...extractTextCandidates(selectedChat)
  ];
  for (const candidate of candidateSources) {
    const normalized = normalizePhone(candidate);
    if (normalized) return normalized;
  }
  const dataId = selectedChat?.getAttribute("data-id") || header?.getAttribute("data-id") || selectedChat?.closest("[data-id]")?.getAttribute("data-id");
  const dataIdPhone = normalizePhone(dataId);
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
async function loginCrm(payload) {
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
//# sourceMappingURL=content.js.map
