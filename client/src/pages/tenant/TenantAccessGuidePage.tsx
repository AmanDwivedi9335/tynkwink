import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";

export default function TenantAccessGuidePage() {
  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box>
        <Typography variant="h4" fontWeight={800}>
          Tenant Access Guide
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Share these steps with new tenant admins so they can log in right away.
        </Typography>
      </Box>

      <Alert severity="info">
        Tenant admins receive their first login credentials when a super admin creates the workspace.
      </Alert>

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
          Steps to log in
        </Typography>
        <Box component="ol" sx={{ pl: 3, m: 0, color: "text.secondary" }}>
          <li>Open the TynkWink login page and enter the tenant admin email address.</li>
          <li>Use the temporary password provided during tenant creation.</li>
          <li>Enter the Tenant ID (slug) if the admin belongs to multiple workspaces.</li>
          <li>After signing in, reset the password from Settings → Security.</li>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Button variant="contained" href="/login" sx={{ borderRadius: 2, fontWeight: 700 }}>
            Go to login
          </Button>
          <Button variant="outlined" sx={{ borderRadius: 2 }}>
            Download guide PDF
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
