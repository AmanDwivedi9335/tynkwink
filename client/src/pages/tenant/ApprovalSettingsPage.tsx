import { useEffect, useState } from "react";
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { api } from "../../lib/api";
import { useAppSelector } from "../../app/hooks";

export default function ApprovalSettingsPage() {
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const [frequency, setFrequency] = useState("60");
  const [defaultOwner, setDefaultOwner] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    api
      .get(`/api/tenants/${tenantId}/settings`)
      .then((response) => {
        const settings = response.data.settings;
        if (settings) {
          setFrequency(String(settings.approvalDigestFrequencyMinutes ?? 60));
          setDefaultOwner(settings.defaultLeadOwnerUserId ?? "");
          setTimezone(settings.timezone ?? "UTC");
        }
      })
      .catch(() => setError("Unable to load settings."));
  }, [tenantId]);

  const handleSave = async () => {
    if (!tenantId) return;
    setStatus(null);
    setError(null);
    try {
      await api.patch(`/api/tenants/${tenantId}/settings`, {
        approvalDigestFrequencyMinutes: Number(frequency),
        defaultLeadOwnerUserId: defaultOwner || null,
        openaiApiKey: openaiKey || undefined,
        timezone,
      });
      setOpenaiKey("");
      setStatus("Settings saved.");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to save settings.");
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          Approval Settings
        </Typography>
        <Typography color="text.secondary">Configure approval digest cadence and OpenAI key.</Typography>
      </Box>

      {status ? <Alert severity="success">{status}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 3 }}>
        <Stack spacing={2}>
          <TextField
            select
            label="Digest frequency"
            value={frequency}
            onChange={(event) => setFrequency(event.target.value)}
          >
            <MenuItem value="30">Every 30 minutes</MenuItem>
            <MenuItem value="60">Every 60 minutes</MenuItem>
            <MenuItem value="120">Every 2 hours</MenuItem>
          </TextField>
          <TextField
            label="Default lead owner user ID"
            value={defaultOwner}
            onChange={(event) => setDefaultOwner(event.target.value)}
            helperText="Fallback owner when assignment is ambiguous."
          />
          <TextField
            label="OpenAI API key"
            type="password"
            value={openaiKey}
            onChange={(event) => setOpenaiKey(event.target.value)}
            helperText="Key is stored encrypted. Leave blank to keep existing."
          />
          <TextField label="Timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
          <Button variant="contained" onClick={handleSave}>
            Save settings
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
