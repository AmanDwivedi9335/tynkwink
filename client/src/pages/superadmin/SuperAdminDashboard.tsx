import { Box, Card, CardContent, Grid, Typography } from "@mui/material";

const stats = [
  { label: "Active Tenants", value: "--" },
  { label: "Pending Requests", value: "--" },
  { label: "System Health", value: "Healthy" },
];

export default function SuperAdminDashboard() {
  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box>
        <Typography variant="h4" fontWeight={700}>
          Super Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage tenants, monitor activity, and keep the platform running smoothly.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {stats.map((stat) => (
          <Grid item xs={12} md={4} key={stat.label}>
            <Card elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">
                  {stat.label}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
