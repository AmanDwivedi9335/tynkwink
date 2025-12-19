import * as React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  ListItemIcon,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { logout } from "../features/auth/authSlice";

const drawerWidth = 240;

const navItems = [
  { label: "Dashboard", to: "/superamanpanel" },
  { label: "Tenants", to: "/superamanpanel/tenants" },
];

export default function SuperAdminLayout() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const navigate = useNavigate();
  const [userMenuAnchor, setUserMenuAnchor] = React.useState<null | HTMLElement>(null);
  const isUserMenuOpen = Boolean(userMenuAnchor);

  const handleUserMenuOpen = (anchor: HTMLElement) => {
    setUserMenuAnchor(anchor);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleProfileSettings = () => {
    handleUserMenuClose();
    navigate("/superamanpanel/profile");
  };

  const handleLogout = () => {
    handleUserMenuClose();
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        color="default"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="h6" fontWeight={700}>
            Super Admin Panel
          </Typography>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer" }}
            onClick={(event) => handleUserMenuOpen(event.currentTarget)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                handleUserMenuOpen(event.currentTarget);
              }
            }}
            aria-controls={isUserMenuOpen ? "superadmin-user-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={isUserMenuOpen ? "true" : undefined}
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : "S"}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {user?.name || "Super Admin"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email || "superadmin"}
              </Typography>
            </Box>
          </Box>
          <Menu
            id="superadmin-user-menu"
            anchorEl={userMenuAnchor}
            open={isUserMenuOpen}
            onClose={handleUserMenuClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem onClick={handleProfileSettings}>
              <ListItemIcon>
                <SettingsOutlinedIcon fontSize="small" />
              </ListItemIcon>
              Profile settings
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutOutlinedIcon fontSize="small" />
              </ListItemIcon>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        <Toolbar />
        <Box sx={{ px: 2, py: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Navigation
          </Typography>
        </Box>
        <Divider />
        <List sx={{ px: 1 }}>
          {navItems.map((item) => (
            <ListItem key={item.to} disablePadding>
              <ListItemButton
                component={NavLink}
                to={item.to}
                end={item.to === "/superamanpanel"}
                sx={{
                  borderRadius: 2,
                  my: 0.5,
                  "&.active": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "& .MuiListItemText-primary": { fontWeight: 700 },
                  },
                }}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, bgcolor: "grey.50", minHeight: "100vh" }}>
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
