import type { RootState } from "../../app/store";

export const selectAuth = (s: RootState) => s.auth;
export const selectAuthStatus = (s: RootState) => s.auth.status;
export const selectAuthError = (s: RootState) => s.auth.error;
export const selectIsAuthenticated = (s: RootState) => s.auth.isAuthenticated;
