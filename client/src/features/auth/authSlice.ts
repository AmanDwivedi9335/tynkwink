import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AuthState, LoginResponse } from "./authTypes";
import { fetchMeThunk, loginThunk } from "./authThunks";
import { storage } from "../../lib/storage";

type AccessTokenPayload = {
  sub?: string;
  tenantId?: string | null;
  role?: string | null;
  exp?: number;
  iat?: number;
};

function decodeJwtPayload(token: string): AccessTokenPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1]!;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as AccessTokenPayload;
  } catch {
    return null;
  }
}

const initialState: AuthState = {
  status: "idle",
  isAuthenticated: !!storage.getAccessToken(),
  accessToken: storage.getAccessToken(),
  user: null,
  tenantId: null,
  role: null,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    hydrateFromStorage(state) {
      const token = storage.getAccessToken();
      state.accessToken = token;
      state.isAuthenticated = !!token;
      if (!token) {
        state.user = null;
        state.tenantId = null;
        state.role = null;
        return;
      }
      const payload = decodeJwtPayload(token);
      state.tenantId = payload?.tenantId ?? null;
      state.role = payload?.role ?? null;
    },
    logout(state) {
      storage.clearAll();
      state.status = "idle";
      state.isAuthenticated = false;
      state.accessToken = null;
      state.user = null;
      state.tenantId = null;
      state.role = null;
      state.error = null;
    },
    setTenantId(state, action: PayloadAction<string | null>) {
      state.tenantId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action: PayloadAction<LoginResponse>) => {
        state.status = "succeeded";
        state.error = null;

        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.user = action.payload.user ?? null;
        state.tenantId = action.payload.tenantId ?? null;
        state.role = action.payload.role ?? null;

        storage.setAccessToken(action.payload.accessToken);
        if (action.payload.refreshToken) storage.setRefreshToken(action.payload.refreshToken);
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = "failed";
        state.isAuthenticated = false;
        state.accessToken = null;
        state.error = action.payload ?? "Login failed.";
      })
      .addCase(fetchMeThunk.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchMeThunk.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.error = null;
        state.user = action.payload.user ?? null;
        state.tenantId = action.payload.auth?.tenantId ?? state.tenantId;
        state.role = action.payload.auth?.role ?? state.role;
        state.isAuthenticated = true;
      })
      .addCase(fetchMeThunk.rejected, (state, action) => {
        storage.clearAll();
        state.status = "failed";
        state.isAuthenticated = false;
        state.accessToken = null;
        state.user = null;
        state.tenantId = null;
        state.role = null;
        state.error = action.payload ?? "Session expired.";
      });
  },
});

export const { logout, hydrateFromStorage, setTenantId } = authSlice.actions;
export default authSlice.reducer;
