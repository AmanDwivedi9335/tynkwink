import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import meRoutes from "./routes/me.routes";
import superAdminRoutes from "./routes/superadmin.routes";

export const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api", meRoutes);
app.use("/api/superadmin", superAdminRoutes);
