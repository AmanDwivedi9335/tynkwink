import * as React from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../../lib/api";

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  userCount: number;
}

interface TenantFormState {
  name: string;
  slug: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

const emptyForm: TenantFormState = {
  name: "",
  slug: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

export default function TenantsPage() {
  const [tenants, setTenants] = React.useState<TenantItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [formState, setFormState] = React.useState<TenantFormState>(emptyForm);
  const [formMessage, setFormMessage] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [selectedTenant, setSelectedTenant] = React.useState<TenantItem | null>(null);

  const loadTenants = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/superadmin/tenants");
      setTenants(res.data.tenants ?? []);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load tenants.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const openCreateDialog = () => {
    setFormState(emptyForm);
    setFormMessage(null);
    setCreateOpen(true);
  };

  const openEditDialog = (tenant: TenantItem) => {
    setSelectedTenant(tenant);
    setFormState({
      name: tenant.name,
      slug: tenant.slug,
      adminName: "",
      adminEmail: "",
      adminPassword: "",
    });
    setFormMessage(null);
    setEditOpen(true);
  };

  const closeDialogs = () => {
    setCreateOpen(false);
    setEditOpen(false);
    setSelectedTenant(null);
  };

  const handleFormChange = (field: keyof TenantFormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleCreateTenant = async () => {
    try {
      setFormMessage(null);
      await api.post("/api/superadmin/tenants", formState);
      closeDialogs();
      await loadTenants();
    } catch (err: any) {
      setFormMessage(err?.response?.data?.message || "Unable to create tenant.");
    }
  };

  const handleUpdateTenant = async () => {
    if (!selectedTenant) return;
    try {
      setFormMessage(null);
      await api.put(`/api/superadmin/tenants/${selectedTenant.id}`, {
        name: formState.name,
        slug: formState.slug,
      });
      closeDialogs();
      await loadTenants();
    } catch (err: any) {
      setFormMessage(err?.response?.data?.message || "Unable to update tenant.");
    }
  };

  const handleDeactivateTenant = async (tenant: TenantItem) => {
    try {
      await api.delete(`/api/superadmin/tenants/${tenant.id}`);
      await loadTenants();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to deactivate tenant.");
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Tenants
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create, manage, and monitor tenant workspaces.
          </Typography>
        </Box>
        <Button variant="contained" onClick={openCreateDialog} sx={{ borderRadius: 2, fontWeight: 700 }}>
          Create Tenant
        </Button>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Slug</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Users</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Loading tenants...
                </TableCell>
              </TableRow>
            ) : tenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No tenants available.
                </TableCell>
              </TableRow>
            ) : (
              tenants.map((tenant) => (
                <TableRow key={tenant.id} hover>
                  <TableCell>{tenant.name}</TableCell>
                  <TableCell>{tenant.slug}</TableCell>
                  <TableCell>
                    <Chip
                      label={tenant.isActive ? "Active" : "Inactive"}
                      color={tenant.isActive ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{tenant.userCount}</TableCell>
                  <TableCell>{new Date(tenant.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell align="right" sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                    <Button size="small" variant="outlined" onClick={() => openEditDialog(tenant)}>
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      color="error"
                      onClick={() => handleDeactivateTenant(tenant)}
                    >
                      Deactivate
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={createOpen} onClose={closeDialogs} fullWidth maxWidth="sm">
        <DialogTitle>Create new tenant</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 2 }}>
          {formMessage ? <Alert severity="error">{formMessage}</Alert> : null}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Tenant name" fullWidth value={formState.name} onChange={handleFormChange("name")} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Tenant slug" fullWidth value={formState.slug} onChange={handleFormChange("slug")} />
            </Grid>
          </Grid>
          <Divider />
          <Typography variant="subtitle1" fontWeight={600}>
            Tenant admin
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Admin name"
                fullWidth
                value={formState.adminName}
                onChange={handleFormChange("adminName")}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Admin email"
                fullWidth
                value={formState.adminEmail}
                onChange={handleFormChange("adminEmail")}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Admin password"
                type="password"
                fullWidth
                value={formState.adminPassword}
                onChange={handleFormChange("adminPassword")}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDialogs}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateTenant} sx={{ fontWeight: 700 }}>
            Create tenant
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={closeDialogs} fullWidth maxWidth="sm">
        <DialogTitle>Edit tenant</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 2 }}>
          {formMessage ? <Alert severity="error">{formMessage}</Alert> : null}
          <TextField label="Tenant name" fullWidth value={formState.name} onChange={handleFormChange("name")} />
          <TextField label="Tenant slug" fullWidth value={formState.slug} onChange={handleFormChange("slug")} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDialogs}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateTenant} sx={{ fontWeight: 700 }}>
            Save changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
