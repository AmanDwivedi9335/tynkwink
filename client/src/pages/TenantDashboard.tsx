import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import FlashOnOutlinedIcon from "@mui/icons-material/FlashOnOutlined";
import { useAppSelector } from "../app/hooks";

const quickActions = [
  {
    title: "Import Leads",
    description: "Import leads from your CRM, WhatsApp, or CSV instantly.",
    action: "Add Leads",
    icon: <ArrowForwardIosIcon fontSize="small" />,
    color: "#e3f2fd",
  },
  {
    title: "Auto Follow-Up",
    description: "Automate follow-ups to re-engage leads and save time.",
    action: "Start Automation",
    icon: <MailOutlineIcon fontSize="small" />,
    color: "#ede7f6",
  },
  {
    title: "Train Your AI",
    description: "Set up your company info to fine-tune TynkWink's AI.",
    action: "Setup Now",
    icon: <SchoolOutlinedIcon fontSize="small" />,
    color: "#e0f2f1",
  },
  {
    title: "Auto Actions",
    description: "Automate actions based on lead or message activity.",
    action: "Automate Now",
    icon: <FlashOnOutlinedIcon fontSize="small" />,
    color: "#fff3e0",
  },
];

const setupSteps = [
  "Install the TynkWink Extension",
  "Connect your WhatsApp",
  "Import your first leads",
  "Create an automation sequence",
  "Train your AI responses",
  "Invite teammates",
  "Launch your first campaign",
];

export default function TenantDashboard() {
  const user = useAppSelector((state) => state.auth.user);
  const displayName = user?.name || user?.fullName || "Aman";
  const [showExtensionBanner, setShowExtensionBanner] = React.useState(true);

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Alert
        severity="warning"
        action={
          <Button color="inherit" variant="contained" size="small" sx={{ borderRadius: 2, fontWeight: 700 }}>
            Upgrade Now
          </Button>
        }
        sx={{ borderRadius: 2 }}
      >
        You are on the Free pack -- Upgrade now to enjoy Unlimited access
      </Alert>

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Welcome, {displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Here's what to focus on to get your workspace live today.
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<PlayCircleOutlineIcon />} sx={{ borderRadius: 2 }}>
            Watch Tutorial
          </Button>
        </Stack>

        {showExtensionBanner ? (
          <Paper
            elevation={0}
            sx={{
              mt: 3,
              p: 2,
              borderRadius: 2,
              bgcolor: "#1976d2",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <ExtensionOutlinedIcon />
              <Typography fontWeight={600}>
                Install the TynkWink Chrome Extension to enable WhatsApp sync and automations.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button variant="contained" color="inherit" sx={{ bgcolor: "white", color: "#1976d2" }}>
                Install Extension
              </Button>
              <IconButton sx={{ color: "white" }} onClick={() => setShowExtensionBanner(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </Paper>
        ) : null}

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            {quickActions.map((action) => (
              <Grid item xs={12} sm={6} md={3} key={action.title}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: action.color,
                    display: "grid",
                    gap: 1.5,
                    height: "100%",
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700}>
                    {action.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {action.description}
                  </Typography>
                  <Button
                    variant="text"
                    endIcon={action.icon}
                    sx={{ justifyContent: "flex-start", p: 0, textTransform: "none", fontWeight: 700 }}
                  >
                    {action.action}
                  </Button>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 3 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Set Up Your Workspace in 7 Steps
            </Typography>
            <Typography variant="body2" color="text.secondary">
              0/{setupSteps.length} Completed
            </Typography>
          </Box>
          <Box sx={{ minWidth: 240 }}>
            <LinearProgress variant="determinate" value={0} sx={{ height: 8, borderRadius: 4 }} />
          </Box>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1.5}>
          {setupSteps.map((step, index) => (
            <Paper
              key={step}
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Chip label={index + 1} color="primary" />
                <Typography fontWeight={600}>{step}</Typography>
              </Stack>
              <Button variant="outlined" size="small" sx={{ borderRadius: 2 }}>
                Mark Done
              </Button>
            </Paper>
          ))}
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 3 }}>
        <Typography variant="h6" fontWeight={800}>
          Tenant Login Guide
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Share these details with tenant admins after creation.
        </Typography>
        <Stack spacing={1}>
          <Typography variant="body2">
            • Tenant admins sign in with their email and temporary password.
          </Typography>
          <Typography variant="body2">
            • Use the Tenant ID (workspace slug) if they belong to multiple tenants.
          </Typography>
          <Typography variant="body2">
            • Encourage admins to reset their password after first login.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
