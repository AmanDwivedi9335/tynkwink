import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import meRoutes from "./routes/me.routes";
import superAdminRoutes from "./routes/superadmin.routes";
import crmRoutes from "./routes/crm.routes";
import integrationRoutes from "./routes/integrations.routes";
import smartTriggerRoutes from "./routes/smart-triggers.routes";
import staffRoutes from "./routes/staff.routes";
import gmailRoutes from "./routes/gmail.routes";
import leadInboxRoutes from "./routes/leadInbox.routes";
import tenantSettingsRoutes from "./routes/tenantSettings.routes";
import extensionRoutes from "./routes/extension.routes";
import { attachCorrelationId } from "./middleware/correlation";

export const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(attachCorrelationId);
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
app.use("/api", staffRoutes);
app.use("/api", gmailRoutes);
app.use("/api", leadInboxRoutes);
app.use("/api", tenantSettingsRoutes);
app.use("/api", extensionRoutes);
