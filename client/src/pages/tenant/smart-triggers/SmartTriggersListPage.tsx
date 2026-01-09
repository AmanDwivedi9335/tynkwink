import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import LaunchIcon from "@mui/icons-material/Launch";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";
import { createDefaultSteps, getProcessedLeads, getRunStateLabel, getRunStateTone } from "./utils";
import type { SmartTriggerFlowSummary } from "./utils";

export default function SmartTriggersListPage() {
  const [flows, setFlows] = useState<SmartTriggerFlowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SmartTriggerFlowSummary | null>(null);
  const navigate = useNavigate();

  const loadFlows = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ flows: SmartTriggerFlowSummary[] }>("/api/smart-triggers");
      setFlows(response.data.flows);
    } catch (err) {
      setError("Unable to load smart triggers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlows();
  }, []);

  const handleCreateFlow = async () => {
    if (!newFlowName.trim()) {
      return;
    }
    const response = await api.post("/api/smart-triggers", {
      name: newFlowName.trim(),
      description: "Custom lead automation flow.",
      steps: createDefaultSteps(),
      status: "DRAFT",
    });
    const created: SmartTriggerFlowSummary = {
      id: response.data.flow.id,
      name: response.data.flow.name,
      status: response.data.flow.status,
      updatedAt: response.data.flow.updatedAt,
    };
    setFlows((prev) => [created, ...prev]);
    setNewFlowName("");
    setIsNewDialogOpen(false);
    navigate(`/app/smart-triggers/${created.id}`);
  };

  const handleDeleteFlow = async () => {
    if (!deleteTarget) {
      return;
    }
    await api.delete(`/api/smart-triggers/${deleteTarget.id}`);
    setFlows((prev) => prev.filter((flow) => flow.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Smart Triggers
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create scalable lead automation flows, monitor their status, and jump into the designer to update modules.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ borderRadius: 2, alignSelf: { xs: "flex-start", md: "center" } }}
          onClick={() => setIsNewDialogOpen(true)}
        >
          New flow
        </Button>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: { xs: 2.5, md: 3 },
          display: "grid",
          gap: 2,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Flow library
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Each flow is ready to run like Zapier-style automations, with live status and lead processing counts.
        </Typography>
        <Divider />
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading flows...
          </Typography>
        ) : error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : flows.length === 0 ? (
          <Stack spacing={1.5} alignItems="flex-start">
            <Typography variant="subtitle1" fontWeight={600}>
              No flows yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create your first workflow to automate lead responses, scoring, and routing.
            </Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setIsNewDialogOpen(true)}>
              Create a flow
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2}>
            {flows.map((flow) => (
              <Paper
                key={flow.id}
                elevation={0}
                sx={{
                  borderRadius: 2.5,
                  border: "1px solid",
                  borderColor: "divider",
                  p: 2,
                  display: "grid",
                  gap: 1.5,
                }}
              >
                <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
                  <Box>
                    <Typography fontWeight={700}>{flow.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Updated {new Date(flow.updatedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Chip label={getRunStateLabel(flow.status)} color={getRunStateTone(flow.status)} size="small" />
                    <Chip label={`${getProcessedLeads(flow.id)} leads processed`} size="small" variant="outlined" />
                  </Stack>
                </Stack>
                <Divider />
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="flex-start">
                  <Button
                    variant="contained"
                    endIcon={<LaunchIcon />}
                    onClick={() => navigate(`/app/smart-triggers/${flow.id}`)}
                  >
                    Open designer
                  </Button>
                  <Button
                    variant="text"
                    color="error"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={() => setDeleteTarget(flow)}
                  >
                    Delete flow
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>

      <Dialog open={isNewDialogOpen} onClose={() => setIsNewDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Create new flow</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Flow name"
            fullWidth
            value={newFlowName}
            onChange={(event) => setNewFlowName(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsNewDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateFlow} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete flow</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will permanently delete {deleteTarget?.name}. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={handleDeleteFlow} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
