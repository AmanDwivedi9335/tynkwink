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
  const [loading, setLoading] = useState(false);

  const selected = useMemo(() => integrations.find((integration) => integration.id === selectedIntegration), [
    integrations,
    selectedIntegration,
  ]);

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

  useEffect(() => {
    if (!tenantId || !selectedIntegration) return;
    api
      .get(`/api/tenants/${tenantId}/integrations/gmail/${selectedIntegration}/rules`)
      .then((response) => setRules(response.data.rules ?? []))
      .catch(() => setError("Unable to load Gmail rules."));
  }, [tenantId, selectedIntegration]);

  const handleConnect = async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/api/tenants/${tenantId}/integrations/gmail/start`, {
        redirectUri: window.location.href,
      });
      window.location.href = response.data.url;
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to start Gmail OAuth flow.");
    } finally {
      setLoading(false);
    }
  };

  const handleRuleSubmit = async () => {
    if (!tenantId || !selectedIntegration) return;
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
          <Typography color="text.secondary">Connect Gmail accounts and define lead rules.</Typography>
        </Box>
        <Button variant="contained" onClick={handleConnect} disabled={loading} sx={{ borderRadius: 2 }}>
          Connect Gmail
        </Button>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 3 }}>
        <Typography variant="h6" fontWeight={700}>
          Connected Accounts
        </Typography>
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
