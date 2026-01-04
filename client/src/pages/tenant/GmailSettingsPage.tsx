import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  LinearProgress,
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
  syncState?: {
    lastSyncAt?: string | null;
    lastError?: string | null;
    lastCheckedCount?: number | null;
    lastMatchedCount?: number | null;
    lastMatchedRulesJson?: { ruleId: string; ruleName: string; matchedCount: number }[] | null;
  } | null;
};

type GmailRule = {
  id: string;
  name: string;
  isActive: boolean;
  conditionsJson: Record<string, unknown>;
  version: number;
};

type GmailQueueStatus = {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
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
  const [ruleIsActive, setRuleIsActive] = useState("active");
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectAlert, setConnectAlert] = useState<{ severity: "success" | "error"; title: string; detail?: string } | null>(
    null
  );
  const [syncAlert, setSyncAlert] = useState<{ severity: "success" | "info" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [queuedSyncAtByIntegration, setQueuedSyncAtByIntegration] = useState<Record<string, string>>({});
  const [queueStatus, setQueueStatus] = useState<GmailQueueStatus | null>(null);

  const formatSyncAt = (value?: string | null, queuedAt?: string | null) => {
    if (value) {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
    }
    if (queuedAt) {
      const date = new Date(queuedAt);
      const formatted = Number.isNaN(date.getTime()) ? queuedAt : date.toLocaleString();
      return `Queued ${formatted}`;
    }
    return "Not yet";
  };

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
        const activeIntegrations = (response.data.integrations ?? []).filter(
          (integration: GmailIntegration) => integration.status !== "REVOKED"
        );
        setIntegrations(activeIntegrations);
        const first = activeIntegrations[0];
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
    if (!selectedIntegration) {
      setRules([]);
      return;
    }
    const stillExists = integrations.some((integration) => integration.id === selectedIntegration);
    if (!stillExists) {
      const next = integrations[0]?.id ?? "";
      setSelectedIntegration(next);
    }
  }, [integrations, selectedIntegration]);

  useEffect(() => {
    if (!tenantId) return;
    void refreshPendingCount();
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    const fetchQueueStatus = async () => {
      try {
        const response = await api.get(`/api/tenants/${tenantId}/integrations/gmail/queue`);
        if (!cancelled) {
          setQueueStatus(response.data.queue ?? null);
        }
      } catch {
        if (!cancelled) {
          setQueueStatus(null);
        }
      }
    };
    void fetchQueueStatus();
    const interval = window.setInterval(fetchQueueStatus, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [tenantId]);

  useEffect(() => {
    setQueuedSyncAtByIntegration((prev) => {
      if (!integrations.length) return {};
      const next: Record<string, string> = {};
      integrations.forEach((integration) => {
        if (!integration.syncState?.lastSyncAt && prev[integration.id]) {
          next[integration.id] = prev[integration.id];
        }
      });
      return next;
    });
  }, [integrations]);

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
      const activeIntegrations = (response.data.integrations ?? []).filter(
        (integration: GmailIntegration) => integration.status !== "REVOKED"
      );
      setIntegrations(activeIntegrations);
      if (selectedIntegration === integrationId) {
        const next = activeIntegrations[0]?.id ?? "";
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
    setSyncAlert(null);
    try {
      const response = await api.post(`/api/tenants/${tenantId}/integrations/gmail/${integrationId}/sync`);
      const status = response.data?.status;
      if (status === "already_queued") {
        setSyncAlert({
          severity: "info",
          message: "A sync is already queued. Please wait a moment and refresh pending leads.",
        });
      } else {
        setSyncAlert({ severity: "success", message: "Gmail sync queued. Refresh pending leads in a moment." });
      }
      setQueuedSyncAtByIntegration((prev) => ({
        ...prev,
        [integrationId]: prev[integrationId] ?? new Date().toISOString(),
      }));
      await refreshPendingCount();
      const integrationsResponse = await api.get(`/api/tenants/${tenantId}/integrations/gmail`);
      const activeIntegrations = (integrationsResponse.data.integrations ?? []).filter(
        (integration: GmailIntegration) => integration.status !== "REVOKED"
      );
      setIntegrations(activeIntegrations);
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
      const payload = {
        name: ruleName,
        isActive: ruleIsActive === "active",
        conditions: {
          from: ruleFrom || undefined,
          subjectContains: ruleSubject || undefined,
          keywords: ruleKeywords ? ruleKeywords.split(",").map((v) => v.trim()).filter(Boolean) : undefined,
          label: ruleLabel || undefined,
          hasAttachments: ruleHasAttachments === "any" ? undefined : ruleHasAttachments === "yes",
          unreadOnly: ruleUnreadOnly === "any" ? undefined : ruleUnreadOnly === "yes",
        },
      };
      if (editingRuleId) {
        await api.patch(
          `/api/tenants/${tenantId}/integrations/gmail/${selectedIntegration}/rules/${editingRuleId}`,
          payload
        );
      } else {
        await api.post(`/api/tenants/${tenantId}/integrations/gmail/${selectedIntegration}/rules`, payload);
      }
      const response = await api.get(`/api/tenants/${tenantId}/integrations/gmail/${selectedIntegration}/rules`);
      setRules(response.data.rules ?? []);
      setRuleName("");
      setRuleFrom("");
      setRuleSubject("");
      setRuleKeywords("");
      setRuleLabel("");
      setRuleHasAttachments("any");
      setRuleUnreadOnly("any");
      setRuleIsActive("active");
      setEditingRuleId(null);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to save rule.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditRule = (rule: GmailRule) => {
    const conditions = (rule.conditionsJson ?? {}) as {
      from?: string;
      subjectContains?: string;
      keywords?: string[];
      label?: string;
      hasAttachments?: boolean;
      unreadOnly?: boolean;
    };
    setRuleName(rule.name);
    setRuleFrom(conditions.from ?? "");
    setRuleSubject(conditions.subjectContains ?? "");
    setRuleKeywords(conditions.keywords?.join(", ") ?? "");
    setRuleLabel(conditions.label ?? "");
    setRuleHasAttachments(
      typeof conditions.hasAttachments === "boolean" ? (conditions.hasAttachments ? "yes" : "no") : "any"
    );
    setRuleUnreadOnly(typeof conditions.unreadOnly === "boolean" ? (conditions.unreadOnly ? "yes" : "no") : "any");
    setRuleIsActive(rule.isActive ? "active" : "inactive");
    setEditingRuleId(rule.id);
  };

  const handleCancelEdit = () => {
    setRuleName("");
    setRuleFrom("");
    setRuleSubject("");
    setRuleKeywords("");
    setRuleLabel("");
    setRuleHasAttachments("any");
    setRuleUnreadOnly("any");
    setRuleIsActive("active");
    setEditingRuleId(null);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!tenantId || !selectedIntegration) return;
    if (!window.confirm("Delete this rule? This cannot be undone.")) return;
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/api/tenants/${tenantId}/integrations/gmail/${selectedIntegration}/rules/${ruleId}`);
      const response = await api.get(`/api/tenants/${tenantId}/integrations/gmail/${selectedIntegration}/rules`);
      setRules(response.data.rules ?? []);
      if (editingRuleId === ruleId) {
        handleCancelEdit();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to delete rule.");
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
      {syncAlert ? <Alert severity={syncAlert.severity}>{syncAlert.message}</Alert> : null}

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
        {queueStatus ? (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" fontWeight={600}>
                Sync queue activity
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {queueStatus.active + queueStatus.waiting} in queue
              </Typography>
            </Stack>
            <LinearProgress
              sx={{ mt: 1, borderRadius: 999 }}
              variant={queueStatus.active + queueStatus.waiting > 0 ? "indeterminate" : "determinate"}
              value={queueStatus.active + queueStatus.waiting > 0 ? undefined : 100}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
              {queueStatus.active + queueStatus.waiting > 0
                ? `${queueStatus.active} active · ${queueStatus.waiting} waiting`
                : "Queue idle"}
            </Typography>
          </Box>
        ) : null}
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
                    Last sync:{" "}
                    {formatSyncAt(
                      integration.syncState?.lastSyncAt,
                      queuedSyncAtByIntegration[integration.id] ?? null
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Checked: {integration.syncState?.lastCheckedCount ?? 0} · Matched:{" "}
                    {integration.syncState?.lastMatchedCount ?? 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Matches by rule:{" "}
                    {integration.syncState?.lastMatchedRulesJson?.length
                      ? integration.syncState.lastMatchedRulesJson
                          .map((rule) => `${rule.ruleName} (${rule.matchedCount})`)
                          .join(", ")
                      : "None yet"}
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
                    disabled={integration.status !== "ACTIVE"}
                  >
                    Manage Rules
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleSyncNow(integration.id)}
                    disabled={loading || integration.status !== "ACTIVE"}
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
        {selectedIntegration && rules.length > 0 && rules.every((rule) => !rule.isActive) ? (
          <Alert severity="warning" sx={{ mt: 2 }}>
            All rules are inactive. Gmail sync will ignore emails until at least one rule is active.
          </Alert>
        ) : null}
        {selectedIntegration && rules.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No rules yet. Create a rule so Gmail sync knows which emails to import.
          </Alert>
        ) : null}
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
            <TextField
              select
              label="Rule status"
              value={ruleIsActive}
              onChange={(event) => setRuleIsActive(event.target.value)}
              fullWidth
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </TextField>
          </Stack>
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={handleRuleSubmit} disabled={loading || !selectedIntegration}>
              {editingRuleId ? "Update rule" : "Save rule"}
            </Button>
            {editingRuleId ? (
              <Button variant="text" onClick={handleCancelEdit} disabled={loading}>
                Cancel edit
              </Button>
            ) : null}
          </Stack>
        </Stack>
        <Divider sx={{ my: 3 }} />
        <Stack spacing={2}>
          {rules.map((rule) => (
            <Paper key={rule.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Typography fontWeight={700}>{rule.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Version {rule.version} • {rule.isActive ? "Active" : "Inactive"}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button variant="outlined" size="small" onClick={() => handleEditRule(rule)} disabled={loading}>
                    Edit
                  </Button>
                  <Button
                    variant="text"
                    color="error"
                    size="small"
                    onClick={() => handleDeleteRule(rule.id)}
                    disabled={loading}
                  >
                    Delete
                  </Button>
                </Stack>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Conditions: {JSON.stringify(rule.conditionsJson)}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}
