import { Box, Typography } from "@mui/material";

export default function TenantDashboard() {
  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "70vh" }}>
      <Box textAlign="center">
        <Typography variant="h4" fontWeight={700}>
          Tenant Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back! Your workspace is ready.
        </Typography>
      </Box>
    </Box>
  );
}
