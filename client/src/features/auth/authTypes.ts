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

export type MeResponse = {
    user: {
        id: string;
        name?: string | null;
        email?: string | null;
    };
    auth: {
        tenantId?: string | null;
        role?: string | null;
    };
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
