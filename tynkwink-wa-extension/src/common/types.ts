export type Direction = "inbound" | "outbound" | "unknown";

export type WhatsAppMessage = {
  text: string;
  direction: Direction;
  ts: string | null;
};

export type SyncPayload = {
  // tenantId is read from extension settings; don't trust client input in backend
  contact: {
    displayName: string | null;
    phoneE164: string | null; // best-effort; WhatsApp Web often hides phone
  };
  chat: {
    title: string;
    isGroup: boolean;
  };
  messages: WhatsAppMessage[];
  meta: {
    pageUrl: string;
    capturedAt: string;
    extractorVersion: string;
  };
};

export type AuthState = {
  apiBase: string | null;
  token: string | null;
  tenantId: string | null;
};

export type ExtensionSummary = {
  tenantId: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  permissions: {
    canSync: boolean;
    canViewPipeline: boolean;
  };
  stats: {
    allChats: number;
    unreadChats: number;
    needsReply: number;
    groups: number;
    pendingReminders: number;
  };
  pipeline: {
    name: string;
    defaultStageId: string | null;
    totalLeads: number;
    stages: Array<{
      id: string;
      name: string;
      color: string;
      count: number;
    }>;
  };
  features: {
    aiAutoReplyEnabled: boolean;
  };
};

export type LoginPayload = {
  email: string;
  password: string;
  tenantId?: string | null;
};

export type BgMessage =
  | { type: "AUTH_SAVE"; auth: AuthState }
  | { type: "AUTH_GET" }
  | { type: "AUTH_LOGIN"; payload: LoginPayload }
  | { type: "SYNC_CHAT"; payload: SyncPayload }
  | { type: "EXTENSION_SUMMARY" };
