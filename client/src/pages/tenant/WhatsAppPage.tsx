import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import SettingsPhoneIcon from "@mui/icons-material/SettingsPhone";
import SendIcon from "@mui/icons-material/Send";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import axios from "axios";
import { api } from "../../lib/api";
import { useAppSelector } from "../../app/hooks";

type IntegrationStatus = "ACTIVE" | "ERROR" | "DISCONNECTED";
type MessageStatus = "QUEUED" | "SENT" | "FAILED";

type WhatsAppIntegration = {
  id: string;
  tenantId: string;
  businessAccountId: string | null;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  status: IntegrationStatus;
  lastValidatedAt: string | null;
  lastValidationError: string | null;
  createdAt: string;
  updatedAt: string;
};

type WhatsAppMessage = {
  id: string;
  direction: "OUTBOUND" | "INBOUND";
  status: MessageStatus;
  recipientPhone: string;
  messageBody: string;
  providerMessageId: string | null;
  providerStatus: string | null;
  providerError: string | null;
  sentAt: string | null;
  createdAt: string;
  lead: { id: string; name: string | null; phone: string | null } | null;
  sentByUser: { id: string; name: string; email: string } | null;
};

type LeadOption = {
  id: string;
  name: string;
  phone: string;
};

type PipelineResponse = {
  leads: Array<{
    id: string;
    personal?: { name?: string; phone?: string };
  }>;
};

const ADMIN_ROLES = new Set(["TENANT_ADMIN", "SUPERADMIN"]);
const SEND_ROLES = new Set(["TENANT_ADMIN", "SUPERADMIN", "SALES_ADMIN", "SALES_EXECUTIVE"]);

function statusChipColor(status: IntegrationStatus | MessageStatus) {
  switch (status) {
    case "ACTIVE":
    case "SENT":
      return "success" as const;
    case "ERROR":
    case "FAILED":
      return "error" as const;
    case "DISCONNECTED":
      return "default" as const;
    case "QUEUED":
    default:
      return "warning" as const;
  }
}

function formatTimestamp(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function resolveErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      if (typeof record.message === "string" && record.message.trim()) {
        return record.message;
      }
    }
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export default function WhatsAppPage() {
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const role = useAppSelector((state) => state.auth.role);

  const isAdmin = role ? ADMIN_ROLES.has(role) : false;
  const canSend = role ? SEND_ROLES.has(role) : false;

  const [integration, setIntegration] = useState<WhatsAppIntegration | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);

  const [connectForm, setConnectForm] = useState({
    accessToken: "",
    phoneNumberId: "",
    businessAccountId: "",
    appId: "",
    webhookVerifyToken: "",
  });
  const [sendForm, setSendForm] = useState({
    leadId: "",
    phone: "",
    message: "",
  });

  const [loadingState, setLoadingState] = useState({
    integration: false,
    connect: false,
    disconnect: false,
    send: false,
    leads: false,
  });

  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const integrationActive = integration?.status === "ACTIVE";

  const loadLeads = useCallback(async () => {
    if (!tenantId) return;
    setLoadingState((prev) => ({ ...prev, leads: true }));
    try {
      const response = await api.get<PipelineResponse>("/api/crm/pipeline");
      const leadOptions: LeadOption[] = (response.data.leads ?? [])
        .map((lead) => ({
          id: lead.id,
          name: lead.personal?.name?.trim() || "Unnamed lead",
          phone: lead.personal?.phone?.trim() || "",
        }))
        .filter((lead) => lead.phone.length > 0);
      setLeads(leadOptions);
    } catch (error) {
      setWarning(resolveErrorMessage(error, "Failed to load leads"));
    } finally {
      setLoadingState((prev) => ({ ...prev, leads: false }));
    }
  }, [tenantId]);

  const loadIntegration = useCallback(async () => {
    if (!tenantId) return;
    setLoadingState((prev) => ({ ...prev, integration: true }));
    setWarning(null);
    try {
      const response = await api.get<{ integration: WhatsAppIntegration | null; messages: WhatsAppMessage[]; warning?: string }>(
        `/api/tenants/${tenantId}/integrations/whatsapp`
      );
      setIntegration(response.data.integration);
      setMessages(response.data.messages ?? []);
      setWarning(response.data.warning ?? null);
    } catch (error) {
      setWarning(resolveErrorMessage(error, "Failed to load WhatsApp integration"));
    } finally {
      setLoadingState((prev) => ({ ...prev, integration: false }));
    }
  }, [tenantId]);

  useEffect(() => {
    void loadIntegration();
    void loadLeads();
  }, [loadIntegration, loadLeads]);

  const selectedLead = useMemo(() => leads.find((lead) => lead.id === sendForm.leadId) ?? null, [leads, sendForm.leadId]);

  useEffect(() => {
    if (selectedLead) {
      setSendForm((prev) => ({ ...prev, phone: selectedLead.phone }));
    }
  }, [selectedLead]);

  const handleConnectSubmit = async () => {
    if (!tenantId) return;
    setFeedback(null);
    setLoadingState((prev) => ({ ...prev, connect: true }));
    try {
      const response = await api.post<{ integration: WhatsAppIntegration; validation: { ok: boolean; error?: string } }>(
        `/api/tenants/${tenantId}/integrations/whatsapp/connect`,
        connectForm
      );
      setIntegration(response.data.integration);
      if (response.data.validation.ok) {
        setFeedback({ type: "success", message: "WhatsApp Business API connected successfully." });
      } else {
        setFeedback({ type: "error", message: response.data.validation.error || "Connected but validation failed." });
      }
      await loadIntegration();
    } catch (error) {
      setFeedback({ type: "error", message: resolveErrorMessage(error, "Failed to connect WhatsApp") });
    } finally {
      setLoadingState((prev) => ({ ...prev, connect: false }));
    }
  };

  const handleDisconnect = async () => {
    if (!tenantId || !integration) return;
    setFeedback(null);
    setLoadingState((prev) => ({ ...prev, disconnect: true }));
    try {
      await api.post(`/api/tenants/${tenantId}/integrations/whatsapp/disconnect`);
      setFeedback({ type: "success", message: "WhatsApp integration disconnected." });
      await loadIntegration();
    } catch (error) {
      setFeedback({ type: "error", message: resolveErrorMessage(error, "Failed to disconnect WhatsApp") });
    } finally {
      setLoadingState((prev) => ({ ...prev, disconnect: false }));
    }
  };

  const handleSendMessage = async () => {
    if (!tenantId) return;
    setFeedback(null);
    setLoadingState((prev) => ({ ...prev, send: true }));
    try {
      const response = await api.post<{ whatsappMessage: WhatsAppMessage }>(`/api/tenants/${tenantId}/whatsapp/messages`, {
        leadId: sendForm.leadId || undefined,
        phone: sendForm.phone || undefined,
        message: sendForm.message,
      });
      setFeedback({ type: "success", message: "Message sent via WhatsApp." });
      setSendForm((prev) => ({ ...prev, message: "" }));
      setMessages((prev) => [response.data.whatsappMessage, ...prev].slice(0, 25));
      await loadIntegration();
    } catch (error) {
      setFeedback({ type: "error", message: resolveErrorMessage(error, "Failed to send WhatsApp message") });
      await loadIntegration();
    } finally {
      setLoadingState((prev) => ({ ...prev, send: false }));
    }
  };

  const connectDisabledReason = !tenantId
    ? "Tenant context is required"
    : !isAdmin
      ? "Only Tenant Admins can connect WhatsApp"
      : undefined;

  const sendDisabledReason = !tenantId
    ? "Tenant context is required"
    : !canSend
      ? "Your role cannot send WhatsApp messages"
      : !integrationActive
        ? "Connect WhatsApp first"
        : undefined;

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            WhatsApp Business API
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Connect each tenant's WhatsApp number and send 1:1 CRM messages with auditability.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<LinkOffIcon />}
            onClick={handleDisconnect}
            disabled={!integration || !isAdmin || loadingState.disconnect}
            sx={{ borderRadius: 2 }}
          >
            Disconnect
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<WhatsAppIcon />}
            onClick={handleConnectSubmit}
            disabled={Boolean(connectDisabledReason) || loadingState.connect}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            {integration ? "Reconnect" : "Connect WhatsApp"}
          </Button>
        </Stack>
      </Box>

      {connectDisabledReason ? <Alert severity="info">{connectDisabledReason}</Alert> : null}
      {!canSend && tenantId ? (
        <Alert severity="warning">You can view connection details, but your role cannot send WhatsApp messages.</Alert>
      ) : null}
      {warning ? <Alert severity="warning">{warning}</Alert> : null}
      {feedback ? <Alert severity={feedback.type}>{feedback.message}</Alert> : null}

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: { xs: 2.5, md: 3 },
          display: "grid",
          gap: 2.5,
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <SettingsPhoneIcon color="success" />
            <Typography variant="h6" fontWeight={700}>
              Connection status
            </Typography>
          </Stack>
          {integration ? (
            <Chip label={integration.status} color={statusChipColor(integration.status)} size="small" />
          ) : (
            <Chip label="NOT CONNECTED" size="small" />
          )}
          {loadingState.integration ? <Chip label="Refreshing…" size="small" variant="outlined" /> : null}
        </Stack>

        {integration ? (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Phone number ID: {integration.phoneNumberId}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Display number: {integration.displayPhoneNumber || "Not returned by Meta"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Business account ID: {integration.businessAccountId || "Optional"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last validated: {formatTimestamp(integration.lastValidatedAt)}
            </Typography>
            {integration.lastValidationError ? (
              <Alert severity="error" sx={{ mt: 1 }}>
                {integration.lastValidationError}
              </Alert>
            ) : null}
          </Stack>
        ) : (
          <Alert severity="info">No WhatsApp connection found for this tenant yet.</Alert>
        )}

        <Divider />

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}>
          <TextField
            label="Permanent access token"
            type="password"
            value={connectForm.accessToken}
            onChange={(event) => setConnectForm((prev) => ({ ...prev, accessToken: event.target.value }))}
            disabled={!isAdmin || loadingState.connect}
            fullWidth
          />
          <TextField
            label="Phone number ID"
            value={connectForm.phoneNumberId}
            onChange={(event) => setConnectForm((prev) => ({ ...prev, phoneNumberId: event.target.value }))}
            disabled={!isAdmin || loadingState.connect}
            fullWidth
          />
          <TextField
            label="Business account ID (optional)"
            value={connectForm.businessAccountId}
            onChange={(event) => setConnectForm((prev) => ({ ...prev, businessAccountId: event.target.value }))}
            disabled={!isAdmin || loadingState.connect}
            fullWidth
          />
          <TextField
            label="App ID (optional)"
            value={connectForm.appId}
            onChange={(event) => setConnectForm((prev) => ({ ...prev, appId: event.target.value }))}
            disabled={!isAdmin || loadingState.connect}
            fullWidth
          />
          <TextField
            label="Webhook verify token (optional)"
            value={connectForm.webhookVerifyToken}
            onChange={(event) => setConnectForm((prev) => ({ ...prev, webhookVerifyToken: event.target.value }))}
            disabled={!isAdmin || loadingState.connect}
            fullWidth
          />
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: { xs: 2.5, md: 3 },
          display: "grid",
          gap: 2.5,
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <SendIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Send WhatsApp message
            </Typography>
          </Stack>
          <Chip label={integrationActive ? "READY" : "CONNECT TO ENABLE"} color={integrationActive ? "success" : "default"} size="small" />
        </Stack>

        {sendDisabledReason ? <Alert severity="info">{sendDisabledReason}</Alert> : null}

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
          <TextField
            select
            label={loadingState.leads ? "Loading leads…" : "Lead"}
            value={sendForm.leadId}
            onChange={(event) =>
              setSendForm((prev) => ({
                ...prev,
                leadId: event.target.value,
              }))
            }
            disabled={Boolean(sendDisabledReason) || loadingState.send}
            fullWidth
          >
            <MenuItem value="">
              <em>Pick a lead (optional)</em>
            </MenuItem>
            {leads.map((lead) => (
              <MenuItem key={lead.id} value={lead.id}>
                {lead.name} • {lead.phone}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Recipient phone"
            value={sendForm.phone}
            onChange={(event) => setSendForm((prev) => ({ ...prev, phone: event.target.value }))}
            disabled={Boolean(sendDisabledReason) || loadingState.send}
            placeholder="e.g. +919876543210"
            fullWidth
          />
          <TextField
            label="Message"
            value={sendForm.message}
            onChange={(event) => setSendForm((prev) => ({ ...prev, message: event.target.value }))}
            disabled={Boolean(sendDisabledReason) || loadingState.send}
            multiline
            minRows={3}
            fullWidth
          />
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={() => void loadIntegration()} disabled={loadingState.integration}>
            Refresh history
          </Button>
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={Boolean(sendDisabledReason) || loadingState.send || !sendForm.message.trim()}
            startIcon={<SendIcon />}
          >
            Send message
          </Button>
        </Stack>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: { xs: 2.5, md: 3 },
          display: "grid",
          gap: 2.5,
          overflowX: "auto",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "flex-start", md: "center" }}>
          <Typography variant="h6" fontWeight={700}>
            Recent WhatsApp activity
          </Typography>
          <Chip label={`${messages.length} messages`} size="small" variant="outlined" />
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Recipient</TableCell>
              <TableCell>Lead</TableCell>
              <TableCell>Message</TableCell>
              <TableCell>Provider ID</TableCell>
              <TableCell>Sent at</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="body2" color="text.secondary">
                    No WhatsApp messages yet. Send one to see it logged here.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              messages.map((message) => (
                <TableRow key={message.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={message.status} color={statusChipColor(message.status)} size="small" />
                      {message.providerError ? (
                        <Chip label="Provider error" color="error" size="small" variant="outlined" />
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell>{message.recipientPhone}</TableCell>
                  <TableCell>{message.lead?.name || "—"}</TableCell>
                  <TableCell sx={{ minWidth: 240 }}>
                    <Typography variant="body2">{message.messageBody}</Typography>
                    {message.providerError ? (
                      <Typography variant="caption" color="error.main">
                        {message.providerError}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell>{message.providerMessageId || "—"}</TableCell>
                  <TableCell>{formatTimestamp(message.sentAt || message.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
