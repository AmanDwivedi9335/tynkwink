import { createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../../lib/api";
import type { LoginRequest, LoginResponse } from "./authTypes";

export const loginThunk = createAsyncThunk<
  LoginResponse,
  LoginRequest,
  { rejectValue: string }
>("auth/login", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post("/api/auth/login", payload);
    return res.data as LoginResponse;
  } catch (err: any) {
    const msg =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      "Login failed. Please verify your credentials.";
    return rejectWithValue(msg);
  }
});
