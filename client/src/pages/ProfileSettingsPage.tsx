import { Box, Divider, Paper, Stack, TextField, Typography } from "@mui/material";
import { useAppSelector } from "../app/hooks";

export default function ProfileSettingsPage() {
  const user = useAppSelector((state) => state.auth.user);
  const role = useAppSelector((state) => state.auth.role);
  const tenantId = useAppSelector((state) => state.auth.tenantId);

  const displayName = user?.name || user?.fullName || "User";
  const email = user?.email || "Not provided";

  return (
    <Box>
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Profile Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review your profile details and account information.
        </Typography>
      </Stack>

      <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }} elevation={0} variant="outlined">
        <Stack spacing={2}>
          <Typography variant="h6" fontWeight={700}>
            Profile Details
          </Typography>
          <Divider />
          <Stack spacing={2}>
            <TextField label="Name" value={displayName} InputProps={{ readOnly: true }} />
            <TextField label="Email" value={email} InputProps={{ readOnly: true }} />
            <TextField label="Role" value={role ?? "User"} InputProps={{ readOnly: true }} />
            <TextField
              label="Tenant ID"
              value={tenantId ?? "Not assigned"}
              InputProps={{ readOnly: true }}
            />
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
