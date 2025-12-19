import * as React from "react";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import AutoFixHighOutlinedIcon from "@mui/icons-material/AutoFixHighOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ExtensionOutlinedIcon from "@mui/icons-material/ExtensionOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../app/hooks";
import { selectIsAuthenticated } from "../features/auth/authSelectors";

const navItems = [
  { label: "Dashboard", icon: <DashboardIcon />, to: "/app" },
  { label: "CRM", icon: <PeopleAltOutlinedIcon />, to: "/app/crm" },
  { label: "Auto Follow-ups", icon: <AutoFixHighOutlinedIcon />, to: "/app/auto-followups" },
  { label: "Knowledge Base", icon: <MenuBookOutlinedIcon />, to: "/app/knowledge-base" },
  { label: "Smart Triggers", icon: <BoltOutlinedIcon />, to: "/app/smart-triggers" },
  { label: "Analytics", icon: <AnalyticsOutlinedIcon />, to: "/app/analytics" },
  { label: "WhatsApp", icon: <WhatsAppIcon />, to: "/app/whatsapp" },
  { label: "Integrations", icon: <ExtensionOutlinedIcon />, to: "/app/integrations" },
  { label: "Tenant Access Guide", icon: <HelpOutlineOutlinedIcon />, to: "/app/access-guide" },
];

export default function TenantLayout() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const role = useAppSelector((state) => state.auth.role);
  const user = useAppSelector((state) => state.auth.user);
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === "SUPERADMIN") {
    return <Navigate to="/superamanpanel" replace />;
  }

  const displayName = user?.name || user?.fullName || user?.email || "Tenant Admin";

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f6fb", display: "flex" }}>
      <Box
        component="aside"
        sx={{
          width: 260,
          bgcolor: "#ffffff",
          borderRight: "1px solid",
          borderColor: "divider",
          display: { xs: "none", lg: "flex" },
          flexDirection: "column",
          p: 2.5,
          gap: 2,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
            }}
          >
            K
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} lineHeight={1}>
              TynkWink
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Flow with the Lead!
            </Typography>
          </Box>
        </Stack>

        <List sx={{ display: "grid", gap: 1 }}>
          {navItems.map((item) => {
            const isActive = item.to === "/app" ? location.pathname === "/app" : location.pathname.startsWith(item.to);
            return (
              <ListItemButton
                key={item.label}
                component={NavLink}
                to={item.to}
                sx={{
                  borderRadius: 2,
                  bgcolor: isActive ? "primary.light" : "transparent",
                  color: isActive ? "primary.main" : "text.primary",
                  fontWeight: 600,
                  "&:hover": { bgcolor: "primary.light" },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            );
          })}
        </List>

        <Paper
          variant="outlined"
          sx={{
            mt: "auto",
            p: 2,
            borderRadius: 3,
            borderColor: "primary.light",
            bgcolor: "rgba(33, 150, 243, 0.06)",
          }}
        >
          <Typography fontWeight={700}>Next Step</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Install the TynkWink Extension
          </Typography>
          <Button
            fullWidth
            variant="contained"
            size="small"
            sx={{ mt: 1.5, borderRadius: 2, fontWeight: 700 }}
          >
            Install Extension
          </Button>
        </Paper>
      </Box>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <AppBar
          position="sticky"
          elevation={0}
          color="transparent"
          sx={{ bgcolor: "#ffffff", borderBottom: "1px solid", borderColor: "divider" }}
        >
          <Toolbar sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button variant="text" sx={{ fontWeight: 600 }}>
                Pricing
              </Button>
              <Button variant="contained" sx={{ borderRadius: 2, fontWeight: 700 }}>
                Book a Demo
              </Button>
              <Stack direction="row" spacing={1} alignItems="center">
                <MonetizationOnOutlinedIcon color="warning" />
                <Typography fontWeight={700}>200</Typography>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button variant="outlined" startIcon={<ExtensionOutlinedIcon />} sx={{ borderRadius: 2 }}>
                Get Extension
              </Button>
              <Button variant="outlined" color="success" startIcon={<WhatsAppIcon />} sx={{ borderRadius: 2 }}>
                Open WhatsApp
              </Button>
              <Tooltip title="Settings">
                <IconButton>
                  <SettingsOutlinedIcon />
                </IconButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem />
              <Stack direction="row" spacing={1} alignItems="center">
                <Badge color="primary" variant="dot">
                  <Avatar>{displayName.charAt(0)}</Avatar>
                </Badge>
                <Box>
                  <Typography fontWeight={700} variant="body2">
                    {displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {tenantId ? `Workspace • ${tenantId}` : "Workspace"}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
