import { useState } from "react";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { api } from "../../lib/api";

export default function IntegrationsPage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{
    total: number;
    imported: number;
    skipped: number;
    window?: { startTime: string; endTime: string };
  } | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncResult(null);

    try {
      const response = await api.post("/api/integrations/indiamart/pull", { lookbackHours: 24 });
      setSyncResult(response.data);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to sync leads from IndiaMART. Please try again.";
      setSyncError(message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Integrations
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Connect CRMs, calendars, and data sources.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" sx={{ borderRadius: 2 }}>
            View API keys
          </Button>
          <Button variant="contained" sx={{ borderRadius: 2, fontWeight: 700 }}>
            Add integration
          </Button>
        </Stack>
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: 3,
          display: "grid",
          gap: 1.5,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          IndiaMART Leads
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Pull your IndiaMART leads into Kraya CRM in a single click.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Requires server environment variables: INDIAMART_GLUSR_CRM_KEY (optional: INDIAMART_BASE_URL).
        </Typography>
        <Box>
          <Button
            variant="contained"
            sx={{ borderRadius: 2, fontWeight: 700 }}
            onClick={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? "Syncing..." : "Pull leads now"}
          </Button>
        </Box>
        {syncResult ? (
          <Alert severity="success">
            Imported {syncResult.imported} / {syncResult.total} leads (skipped {syncResult.skipped} duplicates).
          </Alert>
        ) : null}
        {syncError ? <Alert severity="error">{syncError}</Alert> : null}
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: 3,
          display: "grid",
          gap: 2,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Quick overview
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This module is ready to be configured. Add your data sources, invite teammates, and start tracking
          results from the dashboard.
        </Typography>
        <Box component="ul" sx={{ pl: 3, m: 0, color: "text.secondary" }}>
          {["Connect your CRM", "Enable webhooks", "Sync data every 15 minutes"].map((item) => (
            <Box component="li" key={item} sx={{ mb: 0.5 }}>
              {item}
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
