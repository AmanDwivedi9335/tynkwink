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
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { api } from "../../lib/api";

const roleOptions = [
  { value: "TENANT_ADMIN", label: "Tenant Admin" },
  { value: "SALES_ADMIN", label: "Sales Admin" },
  { value: "SALES_EXECUTIVE", label: "Sales Executive" },
];

type StaffMember = {
  id: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  };
};

const emptyForm = {
  name: "",
  email: "",
  role: "SALES_EXECUTIVE",
  password: "",
};

export default function StaffPage() {
  const [staff, setStaff] = React.useState<StaffMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState<StaffMember | null>(null);
  const [formValues, setFormValues] = React.useState(emptyForm);
  const [saving, setSaving] = React.useState(false);

  const fetchStaff = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/staff");
      setStaff(res.data.staff ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to load staff members.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const openCreateDialog = () => {
    setEditingMember(null);
    setFormValues(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (member: StaffMember) => {
    setEditingMember(member);
    setFormValues({
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      password: "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const handleFormChange = (field: keyof typeof emptyForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleRoleChange = (event: any) => {
    setFormValues((prev) => ({ ...prev, role: event.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const payload: Record<string, string> = {
      name: formValues.name.trim(),
      email: formValues.email.trim(),
      role: formValues.role,
    };

    if (formValues.password.trim()) {
      payload.password = formValues.password.trim();
    }

    try {
      if (editingMember) {
        await api.patch(`/api/staff/${editingMember.id}`, payload);
      } else {
        await api.post("/api/staff", payload);
      }
      setDialogOpen(false);
      await fetchStaff();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to save staff member.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAccess = async (member: StaffMember) => {
    const actionLabel = member.isActive ? "revoke" : "restore";
    if (!window.confirm(`Are you sure you want to ${actionLabel} access for ${member.user.name}?`)) {
      return;
    }

    setError(null);
    try {
      await api.patch(`/api/staff/${member.id}`, { isActive: !member.isActive });
      await fetchStaff();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Unable to update access.");
    }
  };

  const isEdit = Boolean(editingMember);

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight={800}>
              Staff & Permissions
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Invite teammates, manage access, and keep roles aligned with responsibilities.
            </Typography>
          </Box>
          <Button variant="contained" onClick={openCreateDialog} sx={{ borderRadius: 2, fontWeight: 700 }}>
            Add staff member
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Box sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    Loading staff members...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">
                    No staff members yet. Add your first teammate to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>{member.user.name}</TableCell>
                  <TableCell>{member.user.email}</TableCell>
                  <TableCell>
                    {roleOptions.find((role) => role.value === member.role)?.label ?? member.role}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={member.isActive ? "Active" : "Revoked"}
                      color={member.isActive ? "success" : "default"}
                      variant={member.isActive ? "filled" : "outlined"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="outlined" onClick={() => openEditDialog(member)}>
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant={member.isActive ? "text" : "contained"}
                        color={member.isActive ? "error" : "primary"}
                        onClick={() => handleToggleAccess(member)}
                      >
                        {member.isActive ? "Revoke" : "Restore"}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Box>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{isEdit ? "Update staff member" : "Add staff member"}</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 2 }}>
          <TextField
            label="Full name"
            value={formValues.name}
            onChange={handleFormChange("name")}
            fullWidth
          />
          <TextField
            label="Email"
            value={formValues.email}
            onChange={handleFormChange("email")}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel id="staff-role-label">Role</InputLabel>
            <Select
              labelId="staff-role-label"
              label="Role"
              value={formValues.role}
              onChange={handleRoleChange}
            >
              {roleOptions.map((role) => (
                <MenuItem key={role.value} value={role.value}>
                  {role.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label={isEdit ? "Reset password (optional)" : "Temporary password"}
            type="password"
            value={formValues.password}
            onChange={handleFormChange("password")}
            fullWidth
            helperText={isEdit ? "Leave blank to keep the current password." : undefined}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Invite staff"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
