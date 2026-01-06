type OverlayOpts = {
  onSync: () => Promise<any>;
  onCheckAuth: () => Promise<any>;
  onLogin: (payload: { email: string; password: string; tenantId?: string | null }) => Promise<any>;
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
  root.style.inset = "0";
  root.style.zIndex = "999999";
  root.style.pointerEvents = "none";
  root.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";

  root.innerHTML = `
    <style>
      .tw-wa-topbar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 54px;
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
        top: 54px;
        left: 0;
        right: 360px;
        height: 52px;
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
        top: 54px;
        right: 0;
        width: 360px;
        bottom: 0;
        background: #151515;
        border-left: 1px solid rgba(255,255,255,0.08);
        color: #e9f2ff;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        pointer-events: auto;
      }
      .tw-wa-panel h3 {
        margin: 0;
        font-size: 16px;
      }
      .tw-wa-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 12px;
        color: #9aa7b6;
      }
      .tw-wa-input {
        background: #1e1f22;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        padding: 8px 10px;
        color: #f3f7ff;
        font-size: 13px;
      }
      .tw-wa-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .tw-wa-toggle span {
        font-size: 12px;
        color: #9aa7b6;
      }
      .tw-wa-sync {
        margin-top: auto;
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
        max-height: 160px;
        overflow: auto;
        white-space: pre-wrap;
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
      .tw-wa-modal-hint {
        margin-top: 4px;
        font-size: 11px;
        color: #7f8fa4;
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
      .tw-wa-link {
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
        <span>All Chats (222)</span>
        <span>Unread Chats (5)</span>
        <span>Needs Reply (136)</span>
        <span>Groups (20)</span>
        <span>Pending Reminders (14)</span>
      </div>
      <div class="tw-wa-actions">
        <span class="tw-wa-auth-status">Checking CRM login...</span>
        <button class="tw-wa-pill" data-action="login">Login</button>
        <button class="tw-wa-pill" data-action="sync">Sync Chat</button>
      </div>
    </div>
    <div class="tw-wa-pipeline">
      <div class="tw-wa-stage" style="background:#ff914d;"><strong>43</strong><span>New Lead</span></div>
      <div class="tw-wa-stage" style="background:#3f7ccf;"><strong>3</strong><span>Qualified</span></div>
      <div class="tw-wa-stage" style="background:#a975c2;"><strong>2</strong><span>In Conversation</span></div>
      <div class="tw-wa-stage" style="background:#4fb06a;"><strong>2</strong><span>Good Lead</span></div>
      <div class="tw-wa-stage" style="background:#f05a59;"><strong>2</strong><span>Lead Won</span></div>
      <div class="tw-wa-stage" style="background:#8165d5;"><strong>2</strong><span>No Response</span></div>
      <div class="tw-wa-stage" style="background:#4db1d5;"><strong>2</strong><span>Deleted</span></div>
    </div>
    <div class="tw-wa-panel">
      <h3>Personal Info</h3>
      <div class="tw-wa-field">
        <label>Name</label>
        <div class="tw-wa-input">Samyak Golchha</div>
      </div>
      <div class="tw-wa-field">
        <label>Phone</label>
        <div class="tw-wa-input">+91 81871818389</div>
      </div>
      <div class="tw-wa-toggle">
        <div class="tw-wa-input" style="flex:1">AI Auto-Reply Status: On</div>
      </div>
      <div class="tw-wa-field">
        <label>Pipeline</label>
        <div class="tw-wa-input">Leads</div>
      </div>
      <div class="tw-wa-field">
        <label>Stage</label>
        <div class="tw-wa-input">New Lead</div>
      </div>
      <div class="tw-wa-field">
        <label>Source</label>
        <div class="tw-wa-input">Extension</div>
      </div>
      <div class="tw-wa-log" data-role="log"></div>
      <button class="tw-wa-sync" data-action="sync">Sync current chat</button>
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
            <label>Tenant ID</label>
            <input class="tw-wa-input" name="tenantId" list="tw-wa-tenant-options" placeholder="Enter tenant ID" />
            <datalist id="tw-wa-tenant-options"></datalist>
            <span class="tw-wa-modal-hint">Use the tenant ID from your CRM account.</span>
          </div>
          <div class="tw-wa-modal-actions">
            <button class="tw-wa-primary" type="submit">Get Access</button>
            <button class="tw-wa-link" type="button">Forgot Password?</button>
          </div>
          <div class="tw-wa-modal-status" data-role="modal-status"></div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(root);

  const authStatus = root.querySelector(".tw-wa-auth-status") as HTMLSpanElement;
  const modal = root.querySelector('[data-role="modal"]') as HTMLDivElement;
  const modalStatus = root.querySelector('[data-role="modal-status"]') as HTMLDivElement;
  const tenantField = root.querySelector('[data-role="tenant-field"]') as HTMLDivElement;
  const tenantInput = tenantField.querySelector('input[name="tenantId"]') as HTMLInputElement;
  const tenantOptions = tenantField.querySelector("#tw-wa-tenant-options") as HTMLDataListElement;
  const loginForm = root.querySelector('[data-role="login-form"]') as HTMLFormElement;
  const log = root.querySelector('[data-role="log"]') as HTMLDivElement;
  const loginBtn = root.querySelector('[data-action="login"]') as HTMLButtonElement;
  const closeBtn = root.querySelector('[data-action="close"]') as HTMLButtonElement;
  const syncButtons = root.querySelectorAll('[data-action="sync"]');

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
    const res = await opts.onCheckAuth();
    const token = res?.auth?.token ?? null;
    setAuthState(token);
  })();

  loginForm.onsubmit = async (event) => {
    event.preventDefault();
    modalStatus.textContent = "Signing in...";
    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "").trim();
    const tenantId = String(formData.get("tenantId") || "").trim() || null;

    const res = await opts.onLogin({ email, password, tenantId });
    if (!res?.ok) {
      modalStatus.textContent = res?.error || "Login failed.";
      return;
    }

    if (res?.requiresTenantSelection) {
      tenantOptions.innerHTML = "";
      for (const tenant of res.tenants || []) {
        const option = document.createElement("option");
        option.value = tenant.tenantId;
        option.label = `${tenant.tenantName} (${tenant.role})`;
        tenantOptions.appendChild(option);
      }
      if (!tenantInput.value) {
        modalStatus.textContent = "Enter a tenant ID to continue.";
      } else {
        modalStatus.textContent = "Tenant required. Please retry login.";
      }
      return;
    }

    modalStatus.textContent = "Login successful. Credentials synced.";
    setAuthState(res?.auth?.token ?? null);
  };

  syncButtons.forEach((button) => {
    (button as HTMLButtonElement).onclick = async () => {
      log.textContent = "Syncing current chat...";
      try {
        const res = await opts.onSync();
        log.textContent = JSON.stringify(res, null, 2);
      } catch (error: any) {
        log.textContent = `Sync failed: ${error?.message || "unknown error"}`;
      }
    };
  });
}
