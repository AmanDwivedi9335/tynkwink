export type LoginRequest = {
    email: string;
    password: string;
    tenantId?: string;
};

export type LoginResponse = {
    accessToken: string;
    refreshToken: string;
    user?: any;
    tenantId?: string;
};

export type AuthState = {
    status: "idle", "loading", "succeeded", "failed";
    isAuthenticated: boolean;
    accessToken: string | null;
    user: any | null;
    tenantId: string | null;
    error: string | null;
};