import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../../lib/api";
import { useAppSelector } from "../../app/hooks";

type GmailIntegration = {
  id: string;
  gmailAddress: string;
  status: string;
  syncState?: { lastSyncAt?: string | null; lastError?: string | null } | null;
};

type GmailRule = {
  id: string;
  name: string;
  isActive: boolean;
  conditionsJson: Record<string, unknown>;
  version: number;
};

export default function GmailSettingsPage() {
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const [integrations, setIntegrations] = useState<GmailIntegration[]>([]);
  const [rules, setRules] = useState<GmailRule[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<string>("");
  const [ruleName, setRuleName] = useState("");
  const [ruleFrom, setRuleFrom] = useState("");
  const [ruleSubject, setRuleSubject] = useState("");
  const [ruleKeywords, setRuleKeywords] = useState("");
  const [ruleLabel, setRuleLabel] = useState("");
  const [ruleHasAttachments, setRuleHasAttachments] = useState("any");
  const [ruleUnreadOnly, setRuleUnreadOnly] = useState("any");
  const [error, setError] = useState<string | null>(null);
  const [connectAlert, setConnectAlert] = useState<{ severity: "success" | "error"; title: string; detail?: string } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [pendingLoading, setPendingLoading] = useState(false);

  const selected = useMemo(() => integrations.find((integration) => integration.id === selectedIntegration), [
    integrations,
    selectedIntegration,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("gmailConnect");
    if (!status) return;
    const stage = params.get("stage");
    const reason = params.get("reason");
    const gmailAddress = params.get("gmail");
    if (status === "success") {
      setConnectAlert({
        severity: "success",
        title: `Gmail connected${gmailAddress ? `: ${gmailAddress}` : ""}.`,
        detail: "We will start syncing your inbox to import leads from emails.",
      });
    } else {
      const stageLabel =
        stage === "oauth_state"
          ? "validating the OAuth state"
          : stage === "oauth_consent"
          ? "getting your consent"
          : stage === "oauth_callback"
          ? "handling the OAuth callback"
          : stage === "oauth_config"
          ? "loading OAuth configuration"
          : stage === "oauth_setup"
          ? "initializing Google APIs"
          : stage === "oauth_token"
          ? "exchanging the authorization code"
          : stage === "oauth_profile"
          ? "reading your Gmail profile"
          : stage === "oauth_finalize"
          ? "finalizing the connection"
          : "connecting Gmail";
      setConnectAlert({
        severity: "error",
        title: `Gmail connection failed while ${stageLabel}.`,
        detail: reason ?? "Please try again.",
      });
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    api
      .get(`/api/tenants/${tenantId}/integrations/gmail`)
      .then((response) => {
        setIntegrations(response.data.integrations ?? []);
        const first = response.data.integrations?.[0];
        if (first) setSelectedIntegration(first.id);
      })
      .catch(() => setError("Unable to load Gmail integrations."));
  }, [tenantId]);

  const refreshPendingCount = async () => {
    if (!tenantId) return;
    setPendingLoading(true);
    try {
      const response = await api.get(`/api/tenants/${tenantId}/lead-inbox`, {
        params: { status: "PENDING" },
      });
      setPendingCount(response.data.inbox?.length ?? 0);
    } catch {
      setError("Unable to load pending Gmail leads.");
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    if (!tenantId || !selectedIntegration) return;
    api
      .get(`/api/tenants/${tenantId}/integrations/gmail/${selectedIntegration}/rules`)
      .then((response) => setRules(response.data.rules ?? []))
      .catch(() => setError("Unable to load Gmail rules."));
  }, [tenantId, selectedIntegration]);

  useEffect(() => {
    if (!tenantId) return;
    void refreshPendingCount();
  }, [tenantId]);

  const handleConnect = async () => {
    if (!tenantId) {
      setError("Missing tenant context. Please refresh and select a tenant before connecting Gmail.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      const response = await api.post(`/api/tenants/${tenantId}/integrations/gmail/start`, {
        redirectUri,
      });
      const connectUrl = response.data?.url;
      if (!connectUrl) {
        throw new Error("Missing OAuth URL");
      }
      window.location.assign(connectUrl);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to start Gmail OAuth flow.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!tenantId) {
      setError("Missing tenant context. Please refresh and select a tenant before disconnecting Gmail.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/tenants/${tenantId}/integrations/gmail/${integrationId}/disconnect`);
      const response = await api.get(`/api/tenants/${tenantId}/integrations/gmail`);
      setIntegrations(response.data.integrations ?? []);
      if (selectedIntegration === integrationId) {
        const next = response.data.integrations?.[0]?.id ?? "";
        setSelectedIntegration(next);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to disconnect Gmail.");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNow = async (integrationId: string) => {
    if (!tenantId) {
      setError("Missing tenant context. Please refresh and select a tenant before checking Gmail.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/tenants/${tenantId}/integrations/gmail/${integrationId}/sync`);
      await refreshPendingCount();
      const response = await api.get(`/api/tenants/${tenantId}/integrations/gmail`);
      setIntegrations(response.data.integrations ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to sync Gmail right now.");
    } finally {
      setLoading(false);
    }
  };

  const handleRuleSubmit = async () => {
    if (!tenantId) {
      setError("Missing tenant context. Please refresh and select a tenant before saving a rule.");
      return;
    }
    if (!selectedIntegration) return;
    setLoading(true);
    setError(null);
    try {
      await api.post(`/api/tenants/${tenantId}/integrations/gmail/${selectedIntegration}/rules`, {
        name: ruleName,
        isActive: true,
        conditions: {
          from: ruleFrom || undefined,
          subjectContains: ruleSubject || undefined,
          keywords: ruleKeywords ? ruleKeywords.split(",").map((v) => v.trim()).filter(Boolean) : undefined,
          label: ruleLabel || undefined,
          hasAttachments: ruleHasAttachments === "any" ? undefined : ruleHasAttachments === "yes",
          unreadOnly: ruleUnreadOnly === "any" ? undefined : ruleUnreadOnly === "yes",
        },
      });
      const response = await api.get(`/api/tenants/${tenantId}/integrations/gmail/${selectedIntegration}/rules`);
      setRules(response.data.rules ?? []);
      setRuleName("");
      setRuleFrom("");
      setRuleSubject("");
      setRuleKeywords("");
      setRuleLabel("");
      setRuleHasAttachments("any");
      setRuleUnreadOnly("any");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to save rule.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Gmail Lead Sources
          </Typography>
          <Typography color="text.secondary">
            Connect Gmail accounts so we can fetch email leads and apply rules to import them automatically.
          </Typography>
        </Box>
        <Button variant="contained" onClick={handleConnect} disabled={loading || !tenantId} sx={{ borderRadius: 2 }}>
          Connect Gmail
        </Button>
      </Box>

      {connectAlert ? (
        <Alert severity={connectAlert.severity}>
          <Typography fontWeight={600}>{connectAlert.title}</Typography>
          {connectAlert.detail ? <Typography variant="body2">{connectAlert.detail}</Typography> : null}
        </Alert>
      ) : null}

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 3 }}>
        <Typography variant="h6" fontWeight={700}>
          Connected Accounts
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2, alignItems: "center" }}>
          <Typography color="text.secondary">
            Pending Gmail leads: {pendingCount === null ? "—" : pendingCount}
          </Typography>
          <Button variant="outlined" size="small" onClick={refreshPendingCount} disabled={pendingLoading}>
            Refresh pending
          </Button>
        </Stack>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {integrations.length === 0 ? (
            <Typography color="text.secondary">No Gmail accounts connected yet.</Typography>
          ) : (
            integrations.map((integration) => (
              <Paper
                key={integration.id}
                variant="outlined"
                sx={{ p: 2, borderRadius: 2, display: "flex", justifyContent: "space-between" }}
              >
                <Box>
                  <Typography fontWeight={600}>{integration.gmailAddress || "(unknown account)"}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Status: {integration.status}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last sync: {integration.syncState?.lastSyncAt ?? "Not yet"}
                  </Typography>
                  {integration.syncState?.lastError ? (
                    <Typography variant="body2" color="error.main">
                      Sync error: {integration.syncState.lastError}
                    </Typography>
                  ) : null}
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={integration.status} color={integration.status === "ACTIVE" ? "success" : "default"} />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSelectedIntegration(integration.id)}
                  >
                    Manage Rules
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleSyncNow(integration.id)}
                    disabled={loading}
                  >
                    Check Mail
                  </Button>
                  <Button
                    variant="text"
                    color="error"
                    size="small"
                    onClick={() => handleDisconnect(integration.id)}
                    disabled={loading}
                  >
                    Disconnect
                  </Button>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 3 }}>
        <Typography variant="h6" fontWeight={700}>
          Rules for {selected?.gmailAddress || "select an account"}
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Stack spacing={2}>
          <TextField label="Rule name" value={ruleName} onChange={(event) => setRuleName(event.target.value)} />
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="From contains"
              value={ruleFrom}
              onChange={(event) => setRuleFrom(event.target.value)}
              fullWidth
            />
            <TextField
              label="Subject contains"
              value={ruleSubject}
              onChange={(event) => setRuleSubject(event.target.value)}
              fullWidth
            />
          </Stack>
          <TextField
            label="Keywords (comma separated)"
            value={ruleKeywords}
            onChange={(event) => setRuleKeywords(event.target.value)}
          />
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Label"
              value={ruleLabel}
              onChange={(event) => setRuleLabel(event.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Has attachments"
              value={ruleHasAttachments}
              onChange={(event) => setRuleHasAttachments(event.target.value)}
              fullWidth
            >
              <MenuItem value="any">Any</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>
            <TextField
              select
              label="Unread only"
              value={ruleUnreadOnly}
              onChange={(event) => setRuleUnreadOnly(event.target.value)}
              fullWidth
            >
              <MenuItem value="any">Any</MenuItem>
              <MenuItem value="yes">Yes</MenuItem>
              <MenuItem value="no">No</MenuItem>
            </TextField>
          </Stack>
          <Button variant="contained" onClick={handleRuleSubmit} disabled={loading || !selectedIntegration}>
            Save rule
          </Button>
        </Stack>
        <Divider sx={{ my: 3 }} />
        <Stack spacing={2}>
          {rules.map((rule) => (
            <Paper key={rule.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontWeight={700}>{rule.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Version {rule.version} • {rule.isActive ? "Active" : "Inactive"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Conditions: {JSON.stringify(rule.conditionsJson)}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
