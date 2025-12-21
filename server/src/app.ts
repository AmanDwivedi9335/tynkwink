import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import meRoutes from "./routes/me.routes";
import superAdminRoutes from "./routes/superadmin.routes";
import crmRoutes from "./routes/crm.routes";
import integrationRoutes from "./routes/integrations.routes";
import smartTriggerRoutes from "./routes/smart-triggers.routes";

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
app.use("/api", crmRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api", smartTriggerRoutes);
