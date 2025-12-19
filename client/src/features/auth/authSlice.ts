import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { AuthState, LoginResponse } from "./authTypes";
import { loginThunk } from "./authThunks";
import { storage } from "../../lib/storage";

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
      });
  },
});

export const { logout, hydrateFromStorage, setTenantId } = authSlice.actions;
export default authSlice.reducer;
