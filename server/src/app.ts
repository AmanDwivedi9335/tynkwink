import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import meRoutes from "./routes/me.routes";

export const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api", meRoutes);
