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
    role?: string;
    redirectTo?: string;
};

export type AuthState = {
    status: "idle", "loading", "succeeded", "failed";
    isAuthenticated: boolean;
    accessToken: string | null;
    user: any | null;
    tenantId: string | null;
    role: string | null;
    error: string | null;
};
