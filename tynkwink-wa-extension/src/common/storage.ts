import type { AuthState } from "./types";

const KEY = "tynkwink_auth_v1";

export async function saveAuth(auth: AuthState) {
  await chrome.storage.local.set({ [KEY]: auth });
}

export async function getAuth(): Promise<AuthState> {
  const res = await chrome.storage.local.get([KEY]);
  const auth = res[KEY] as AuthState | undefined;

  return {
    apiBase: auth?.apiBase ?? null,
    token: auth?.token ?? null,
    tenantId: auth?.tenantId ?? null
  };
}
