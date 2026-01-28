import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../../lib/api";
import { useAppSelector } from "../../app/hooks";

type SmtpCredential = {
  id: string;
  tenantId: string;
  userId: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromEmail: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  lastMessageAt?: string | null;
  passwordSet?: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
  };
};

type SmtpMessageLog = {
  id: string;
  tenantId: string;
  userId: string;
  smtpCredentialId: string;
  toEmail: string;
  subject: string;
  body: string;
  status: "SUCCESS" | "FAILED";
  errorMessage?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
};

const adminRoles = ["TENANT_ADMIN", "SALES_ADMIN"];

export default function SmtpSettingsPage() {
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const role = useAppSelector((state) => state.auth.role);
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = adminRoles.includes(role ?? "");

  const [credentials, setCredentials] = useState<SmtpCredential[]>([]);
  const [messages, setMessages] = useState<SmtpMessageLog[]>([]);
  const [messagesTotal, setMessagesTotal] = useState(0);
  const [messagesPage, setMessagesPage] = useState(1);
  const [messagesPageSize, setMessagesPageSize] = useState(25);
  const [messagesUserId, setMessagesUserId] = useState("");

  const [host, setHost] = useState("");
  const [port, setPort] = useState("587");
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [fromEmail, setFromEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const myCredential = useMemo(() => {
    if (!user) return null;
    return credentials.find((credential) => credential.userId === user.id) ?? null;
  }, [credentials, user]);

  const loadCredentials = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/tenants/${tenantId}/smtp-credentials`);
      setCredentials(response.data.credentials ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to load SMTP credentials.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const loadMessages = useCallback(async () => {
    if (!tenantId || !isAdmin) return;
    setMessageLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/tenants/${tenantId}/smtp-messages`, {
        params: {
          page: messagesPage,
          pageSize: messagesPageSize,
          userId: messagesUserId || undefined,
        },
      });
      setMessages(response.data.messages ?? []);
      setMessagesTotal(response.data.total ?? 0);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to load SMTP message logs.");
    } finally {
      setMessageLoading(false);
    }
  }, [isAdmin, messagesPage, messagesPageSize, messagesUserId, tenantId]);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  useEffect(() => {
    if (!isAdmin) return;
    loadMessages();
  }, [isAdmin, loadMessages]);

  useEffect(() => {
    if (!myCredential) return;
    setHost(myCredential.host ?? "");
    setPort(String(myCredential.port ?? "587"));
    setSecure(Boolean(myCredential.secure));
    setUsername(myCredential.username ?? "");
    setFromEmail(myCredential.fromEmail ?? "");
    setPassword("");
    setPasswordTouched(false);
  }, [myCredential]);

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const payload: Record<string, string | number | boolean> = {
        host: host.trim(),
        port: Number(port),
        secure,
        username: username.trim(),
      };
      if (fromEmail.trim()) payload.fromEmail = fromEmail.trim();
      if (passwordTouched && password.trim()) payload.password = password.trim();
      await api.put(`/api/tenants/${tenantId}/smtp-credentials/me`, payload);
      setPassword("");
      setPasswordTouched(false);
      setStatus("SMTP settings saved.");
      await loadCredentials();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to save SMTP settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!tenantId) return;
    if (!window.confirm("Remove your SMTP settings? This will disable sending from your account.")) {
      return;
    }
    setDeleting(true);
    setStatus(null);
    setError(null);
    try {
      await api.delete(`/api/tenants/${tenantId}/smtp-credentials/me`);
      setHost("");
      setPort("587");
      setSecure(false);
      setUsername("");
      setPassword("");
      setPasswordTouched(false);
      setFromEmail("");
      setStatus("SMTP settings removed.");
      await loadCredentials();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to delete SMTP settings.");
    } finally {
      setDeleting(false);
    }
  };

  const handleTest = async () => {
    if (!tenantId) return;
    setTesting(true);
    setStatus(null);
    setError(null);
    try {
      const payload: Record<string, string | number | boolean> = {
        host: host.trim(),
        port: Number(port),
        secure,
        username: username.trim(),
      };
      if (fromEmail.trim()) payload.fromEmail = fromEmail.trim();
      if (passwordTouched && password.trim()) payload.password = password.trim();
      if (user?.email) payload.toEmail = user.email;
      await api.post(`/api/tenants/${tenantId}/smtp-credentials/me/test`, payload);
      setStatus(`Test email sent to ${user?.email ?? "your inbox"}.`);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to send test email.");
    } finally {
      setTesting(false);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  const messagePages = Math.max(1, Math.ceil(messagesTotal / messagesPageSize));

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          SMTP Settings
        </Typography>
        <Typography color="text.secondary">
          Connect a personal SMTP account so your sequences can send emails from your address. Passwords are encrypted at rest.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {status && <Alert severity="success">{status}</Alert>}

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              My SMTP Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Use an app password if your provider requires MFA. Leave password blank to keep the existing one.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="SMTP host"
              value={host}
              onChange={(event) => setHost(event.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Port"
              value={port}
              onChange={(event) => setPort(event.target.value)}
              type="number"
              inputProps={{ min: 1 }}
              sx={{ width: { xs: "100%", md: 140 } }}
              required
            />
            <FormControlLabel
              control={<Switch checked={secure} onChange={(event) => setSecure(event.target.checked)} />}
              label="Use SSL/TLS"
            />
          </Stack>

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="SMTP username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              fullWidth
              required
            />
            <TextField
              label="From email"
              value={fromEmail}
              onChange={(event) => setFromEmail(event.target.value)}
              fullWidth
              helperText="Optional override for the sender address."
            />
          </Stack>

          <TextField
            label="SMTP password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onFocus={() => setPasswordTouched(true)}
            fullWidth
            helperText={myCredential?.passwordSet ? "Leave blank to keep your existing password." : "Required for first-time setup."}
            autoComplete="new-password"
          />
          <TextField
            label="Test email recipient"
            value={user?.email ?? ""}
            fullWidth
            disabled
            helperText="We'll send a test message to your login email."
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button variant="contained" onClick={handleSave} disabled={saving || loading}>
              {saving ? "Saving..." : "Save SMTP Settings"}
            </Button>
            <Button variant="outlined" onClick={handleTest} disabled={testing || loading}>
              {testing ? "Sending test..." : "Send test email"}
            </Button>
            <Button variant="outlined" color="error" onClick={handleDelete} disabled={deleting || !myCredential}>
              {deleting ? "Removing..." : "Remove SMTP Settings"}
            </Button>
          </Stack>

          {myCredential && (
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Chip label={`Last updated: ${formatDate(myCredential.updatedAt)}`} />
              <Chip label={`Messages sent: ${myCredential.messageCount ?? 0}`} />
              {myCredential.lastMessageAt && <Chip label={`Last message: ${formatDate(myCredential.lastMessageAt)}`} />}
            </Stack>
          )}
        </Stack>
      </Paper>

      {isAdmin && (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Tenant SMTP Accounts
              </Typography>
              <Typography variant="body2" color="text.secondary">
                View which users linked SMTP accounts and their activity for compliance and troubleshooting.
              </Typography>
            </Box>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Host</TableCell>
                  <TableCell>Port</TableCell>
                  <TableCell>Secure</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>From Email</TableCell>
                  <TableCell>Messages</TableCell>
                  <TableCell>Last Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {credentials.map((credential) => (
                  <TableRow key={credential.id}>
                    <TableCell>{credential.user ? `${credential.user.name} (${credential.user.email})` : credential.userId}</TableCell>
                    <TableCell>{credential.host}</TableCell>
                    <TableCell>{credential.port}</TableCell>
                    <TableCell>{credential.secure ? "Yes" : "No"}</TableCell>
                    <TableCell>{credential.username}</TableCell>
                    <TableCell>{credential.fromEmail}</TableCell>
                    <TableCell>{credential.messageCount ?? 0}</TableCell>
                    <TableCell>{formatDate(credential.lastMessageAt)}</TableCell>
                  </TableRow>
                ))}
                {!credentials.length && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography color="text.secondary">No SMTP accounts linked yet.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Stack>
        </Paper>
      )}

      {isAdmin && (
        <Paper sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                SMTP Message Logs
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Track delivery activity per user. Filters help narrow down logs for audits.
              </Typography>
            </Box>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                select
                label="Filter by user"
                value={messagesUserId}
                onChange={(event) => {
                  setMessagesUserId(event.target.value);
                  setMessagesPage(1);
                }}
                fullWidth
              >
                <MenuItem value="">All users</MenuItem>
                {credentials
                  .filter((credential) => credential.user)
                  .map((credential) => (
                    <MenuItem key={credential.userId} value={credential.userId}>
                      {credential.user?.name} ({credential.user?.email})
                    </MenuItem>
                  ))}
              </TextField>
              <TextField
                select
                label="Rows per page"
                value={messagesPageSize}
                onChange={(event) => {
                  setMessagesPageSize(Number(event.target.value));
                  setMessagesPage(1);
                }}
                sx={{ width: { xs: "100%", md: 200 } }}
              >
                {[10, 25, 50, 100].map((size) => (
                  <MenuItem key={size} value={size}>
                    {size}
                  </MenuItem>
                ))}
              </TextField>
              <Button variant="outlined" onClick={loadMessages} disabled={messageLoading}>
                {messageLoading ? "Refreshing..." : "Refresh Logs"}
              </Button>
            </Stack>

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Recipient</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Error</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {messages.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell>{formatDate(message.createdAt)}</TableCell>
                    <TableCell>{message.user ? `${message.user.name} (${message.user.email})` : message.userId}</TableCell>
                    <TableCell>{message.toEmail}</TableCell>
                    <TableCell>{message.subject}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={message.status}
                        color={message.status === "SUCCESS" ? "success" : "error"}
                      />
                    </TableCell>
                    <TableCell>{message.errorMessage ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {!messages.length && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography color="text.secondary">No SMTP message logs yet.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Page {messagesPage} of {messagePages} · {messagesTotal} total messages
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={messagesPage <= 1}
                  onClick={() => setMessagesPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={messagesPage >= messagePages}
                  onClick={() => setMessagesPage((prev) => Math.min(messagePages, prev + 1))}
                >
                  Next
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
