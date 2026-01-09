import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import SaveIcon from "@mui/icons-material/Save";
import { useEffect, useState, type MouseEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../lib/api";
import {
  SmartTriggerFlow,
  SmartTriggerFlowSummary,
  SmartTriggerStep,
  createDefaultSteps,
  getProcessedLeads,
  getRunStateLabel,
  getRunStateTone,
  stepIconMap,
  stepTemplates,
} from "./utils";

export default function SmartTriggersFlowPage() {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();
  const [flows, setFlows] = useState<SmartTriggerFlowSummary[]>([]);
  const [activeFlow, setActiveFlow] = useState<SmartTriggerFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const loadFlow = async (targetId: string) => {
    const response = await api.get<{ flow: SmartTriggerFlow }>(`/api/smart-triggers/${targetId}`);
    setActiveFlow(response.data.flow);
  };

  const loadFlows = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ flows: SmartTriggerFlowSummary[] }>("/api/smart-triggers");
      setFlows(response.data.flows);
    } catch (err) {
      setError("Unable to load smart triggers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlows();
  }, []);

  useEffect(() => {
    if (!flowId) {
      return;
    }
    loadFlow(flowId).catch(() => {
      setError("Unable to load the selected flow.");
    });
  }, [flowId]);

  const handleFlowChange = (selectedId: string) => {
    if (selectedId === activeFlow?.id) {
      return;
    }
    navigate(`/app/smart-triggers/${selectedId}`);
  };

  const handleOpenStepMenu = (event: MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleCloseStepMenu = () => {
    setMenuAnchor(null);
  };

  const handleAddStep = (templateStep: SmartTriggerStep) => {
    if (!activeFlow) {
      return;
    }
    const nextStep: SmartTriggerStep = {
      ...templateStep,
      id: `${templateStep.id}-${crypto.randomUUID()}`,
    };
    setActiveFlow({
      ...activeFlow,
      steps: [...activeFlow.steps, nextStep],
    });
    handleCloseStepMenu();
  };

  const handleRemoveStep = (stepId: string) => {
    if (!activeFlow) {
      return;
    }
    setActiveFlow({
      ...activeFlow,
      steps: activeFlow.steps.filter((step) => step.id !== stepId),
    });
  };

  const handleStepChange = (stepId: string, field: "title" | "detail", value: string) => {
    if (!activeFlow) {
      return;
    }
    setActiveFlow({
      ...activeFlow,
      steps: activeFlow.steps.map((step) => (step.id === stepId ? { ...step, [field]: value } : step)),
    });
  };

  const handleSave = async (status?: SmartTriggerFlow["status"]) => {
    if (!activeFlow) {
      return;
    }
    setIsSaving(true);
    try {
      const response = await api.put<{ flow: SmartTriggerFlow }>(`/api/smart-triggers/${activeFlow.id}`, {
        name: activeFlow.name,
        description: activeFlow.description,
        status: status ?? activeFlow.status,
        steps: activeFlow.steps,
      });
      setActiveFlow(response.data.flow);
      setFlows((prev) =>
        prev.map((flow) =>
          flow.id === response.data.flow.id
            ? {
                id: response.data.flow.id,
                name: response.data.flow.name,
                status: response.data.flow.status,
                updatedAt: response.data.flow.updatedAt,
              }
            : flow
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFlow = async () => {
    if (!activeFlow) {
      return;
    }
    await api.delete(`/api/smart-triggers/${activeFlow.id}`);
    navigate("/app/smart-triggers");
  };

  const handleCreateModuleSet = () => {
    if (!activeFlow) {
      return;
    }
    setActiveFlow({
      ...activeFlow,
      steps: [...activeFlow.steps, ...createDefaultSteps()],
    });
  };

  const isPublished = activeFlow?.status === "PUBLISHED";

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/app/smart-triggers")}>
            Back to flows
          </Button>
          <Typography variant="h4" fontWeight={800}>
            {activeFlow?.name ?? "Flow designer"}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Edit modules, pause or resume automation, and monitor lead processing in real time.
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", sm: "center" }}>
          <FormControl size="small" sx={{ minWidth: 200 }} disabled={loading || flows.length === 0}>
            <InputLabel id="flow-select-label">Flow</InputLabel>
            <Select
              labelId="flow-select-label"
              label="Flow"
              value={activeFlow?.id ?? ""}
              onChange={(event) => handleFlowChange(event.target.value)}
            >
              {flows.map((flow) => (
                <MenuItem key={flow.id} value={flow.id}>
                  {flow.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={isPublished ? <PauseCircleOutlineIcon /> : <PlayCircleOutlineIcon />}
            onClick={() => handleSave(isPublished ? "DRAFT" : "PUBLISHED")}
            disabled={!activeFlow || isSaving}
          >
            {isPublished ? "Pause flow" : "Resume flow"}
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!activeFlow || isSaving}
            onClick={() => handleSave()}
          >
            {isSaving ? "Saving..." : "Save updates"}
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : null}

      {loading && !activeFlow ? (
        <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 360 }}>
          <CircularProgress />
        </Stack>
      ) : activeFlow ? (
        <Stack spacing={3}>
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
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  Flow overview
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage metadata, ownership, and the operational status of the automation.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip label={getRunStateLabel(activeFlow.status)} color={getRunStateTone(activeFlow.status)} />
                <Chip label={`${getProcessedLeads(activeFlow.id)} leads processed`} variant="outlined" />
              </Stack>
            </Stack>
            <Divider />
            <Stack spacing={2}>
              <TextField
                label="Flow name"
                value={activeFlow.name}
                onChange={(event) => setActiveFlow({ ...activeFlow, name: event.target.value })}
              />
              <TextField
                label="Description"
                value={activeFlow.description ?? ""}
                onChange={(event) => setActiveFlow({ ...activeFlow, description: event.target.value })}
                multiline
                minRows={2}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", sm: "center" }}>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={handleOpenStepMenu}>
                  Add module
                </Button>
                <Button variant="outlined" onClick={handleCreateModuleSet}>
                  Add full template
                </Button>
                <Button
                  variant="text"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete flow
                </Button>
              </Stack>
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "1px solid",
              borderColor: "divider",
              p: { xs: 2.5, md: 3 },
              display: "grid",
              gap: 2,
              backgroundImage: "radial-gradient(rgba(93, 74, 184, 0.12) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          >
            <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Automation modules
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Update triggers and actions. Remove any module to reshape the lead journey.
                </Typography>
              </Box>
              <Button variant="outlined" onClick={handleOpenStepMenu}>
                Add module
              </Button>
            </Stack>

            <Stack spacing={2}>
              {activeFlow.steps.map((step, index) => (
                <Paper
                  key={step.id}
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    p: 2,
                    display: "grid",
                    gap: 1.5,
                    backgroundColor: "rgba(255,255,255,0.92)",
                  }}
                >
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
                    <Avatar sx={{ bgcolor: "primary.light", color: "primary.main" }}>{stepIconMap[step.type]}</Avatar>
                    <Box sx={{ flex: 1, display: "grid", gap: 1 }}>
                      <Typography variant="overline" color="text.secondary">
                        Step {index + 1} · {step.label}
                      </Typography>
                      <TextField
                        label="Title"
                        value={step.title}
                        onChange={(event) => handleStepChange(step.id, "title", event.target.value)}
                      />
                      <TextField
                        label="Details"
                        value={step.detail}
                        onChange={(event) => handleStepChange(step.id, "detail", event.target.value)}
                        multiline
                        minRows={2}
                      />
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        {step.tags.map((tag) => (
                          <Chip
                            key={`${step.id}-${tag}`}
                            label={tag}
                            size="small"
                            color={tag.toLowerCase().includes("whatsapp") ? "success" : "default"}
                            variant={tag.toLowerCase().includes("whatsapp") ? "filled" : "outlined"}
                          />
                        ))}
                      </Stack>
                    </Box>
                    <IconButton size="small" onClick={() => handleRemoveStep(step.id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Select a flow from the list to start editing.
        </Typography>
      )}

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleCloseStepMenu}>
        {stepTemplates.map((step) => (
          <MenuItem key={step.id} onClick={() => handleAddStep(step)}>
            {step.title}
          </MenuItem>
        ))}
      </Menu>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete flow</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Deleting this flow will remove all modules and stop automation for connected leads.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteFlow} color="error" variant="contained">
            Delete flow
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
