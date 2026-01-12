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
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import SaveIcon from "@mui/icons-material/Save";
import { useEffect, useState, type MouseEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../lib/api";
import {
  createDefaultSteps,
  getProcessedLeads,
  getRunStateLabel,
  getRunStateTone,
  stepIconMap,
  stepTemplates,
} from "./utils";
import type { SmartTriggerFlow, SmartTriggerFlowSummary, SmartTriggerStep } from "./utils";

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
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isStepDetailsOpen, setIsStepDetailsOpen] = useState(true);
  const [isFlowSettingsOpen, setIsFlowSettingsOpen] = useState(false);

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
    setIsStepDetailsOpen(true);
    loadFlow(flowId).catch(() => {
      setError("Unable to load the selected flow.");
    });
  }, [flowId]);

  useEffect(() => {
    if (!activeFlow?.steps.length) {
      setSelectedStepId(null);
      setIsStepDetailsOpen(false);
      return;
    }
    if (!isStepDetailsOpen) {
      return;
    }
    if (selectedStepId && activeFlow.steps.some((step) => step.id === selectedStepId)) {
      return;
    }
    setSelectedStepId(activeFlow.steps[0].id);
  }, [activeFlow?.steps, selectedStepId, isStepDetailsOpen]);

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
    setSelectedStepId(nextStep.id);
    setIsStepDetailsOpen(true);
    handleCloseStepMenu();
  };

  const handleRemoveStep = (stepId: string) => {
    if (!activeFlow) {
      return;
    }
    const nextSteps = activeFlow.steps.filter((step) => step.id !== stepId);
    setActiveFlow({
      ...activeFlow,
      steps: nextSteps,
    });
    if (selectedStepId === stepId) {
      setSelectedStepId(nextSteps[0]?.id ?? null);
      setIsStepDetailsOpen(nextSteps.length > 0);
    }
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

  const handleStepDrop = (targetId: string) => {
    if (!activeFlow || !draggedStepId || draggedStepId === targetId) {
      return;
    }
    const steps = [...activeFlow.steps];
    const fromIndex = steps.findIndex((step) => step.id === draggedStepId);
    const toIndex = steps.findIndex((step) => step.id === targetId);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }
    const [moved] = steps.splice(fromIndex, 1);
    steps.splice(toIndex, 0, moved);
    setActiveFlow({ ...activeFlow, steps });
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
    const nextSteps = [...activeFlow.steps, ...createDefaultSteps()];
    setActiveFlow({
      ...activeFlow,
      steps: nextSteps,
    });
    setSelectedStepId(nextSteps[0]?.id ?? null);
  };

  const isPublished = activeFlow?.status === "PUBLISHED";
  const selectedStep = activeFlow?.steps.find((step) => step.id === selectedStepId) ?? null;

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
          <Button variant="outlined" onClick={() => setIsFlowSettingsOpen(true)} disabled={!activeFlow}>
            Flow settings
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
              overflow: "hidden",
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
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Button variant="outlined" onClick={handleCreateModuleSet}>
                  Add full template
                </Button>
                <Button variant="outlined" onClick={handleOpenStepMenu}>
                  Add module
                </Button>
              </Stack>
            </Stack>

            <Box
              sx={{
                position: "relative",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "rgba(255,255,255,0.9)",
                overflow: "hidden",
                minHeight: { xs: 520, md: 720 },
                height: { md: "calc(100vh - 280px)" },
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: "radial-gradient(rgba(90, 99, 120, 0.18) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              />
              <Stack
                direction={{ xs: "column", md: "row" }}
                alignItems={{ xs: "flex-start", md: "center" }}
                justifyContent="space-between"
                sx={{
                  position: "relative",
                  zIndex: 1,
                  px: { xs: 2.5, md: 3 },
                  py: 2,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Chip label={getRunStateLabel(activeFlow.status)} color={getRunStateTone(activeFlow.status)} />
                  <Chip label={`${getProcessedLeads(activeFlow.id)} leads processed`} variant="outlined" />
                </Stack>
                <Button
                  size="small"
                  variant={isPreviewMode ? "contained" : "outlined"}
                  onClick={() => setIsPreviewMode((prev) => !prev)}
                >
                  {isPreviewMode ? "Exit preview" : "Preview mode"}
                </Button>
              </Stack>
              <Box
                sx={{
                  position: "relative",
                  zIndex: 1,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 320px" },
                  gap: { xs: 2, lg: 3 },
                  px: { xs: 2, md: 4 },
                  py: { xs: 3, md: 4 },
                }}
              >
                <Box sx={{ overflowX: "auto" }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: { xs: 2, md: 3 },
                      minHeight: { xs: 320, md: 380 },
                      width: "fit-content",
                      pb: 2,
                    }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        p: 2,
                        minWidth: 220,
                        backgroundColor: "background.paper",
                        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
                      }}
                    >
                      <Stack spacing={1}>
                        <Chip label="Start" size="small" color="primary" />
                        <Typography variant="subtitle2" fontWeight={600}>
                          Entry point
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Your flow begins from this block. Connect it to trigger automation.
                        </Typography>
                      </Stack>
                    </Paper>
                    {activeFlow.steps.map((step, index) => {
                      const isSelected = selectedStepId === step.id;
                      return (
                        <Box
                          key={step.id}
                          sx={{ display: "flex", alignItems: "center", gap: { xs: 2, md: 3 } }}
                        >
                          <Box sx={{ width: { xs: 40, md: 56 }, height: 2, bgcolor: "divider", position: "relative" }}>
                            <Box
                              sx={{
                                position: "absolute",
                                right: -6,
                                top: -5,
                                width: 12,
                                height: 12,
                                borderRadius: "50%",
                                border: "2px solid",
                                borderColor: "primary.main",
                                bgcolor: "background.paper",
                              }}
                            />
                          </Box>
                          <Paper
                            elevation={0}
                            draggable
                            onDragStart={(event) => {
                              event.dataTransfer.setData("text/plain", step.id);
                              event.dataTransfer.effectAllowed = "move";
                              setDraggedStepId(step.id);
                            }}
                            onDragEnd={() => setDraggedStepId(null)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => handleStepDrop(step.id)}
                            onClick={() => {
                              setSelectedStepId(step.id);
                              setIsStepDetailsOpen(true);
                            }}
                            sx={{
                              borderRadius: 2,
                              border: "1px solid",
                              borderColor: isSelected ? "primary.main" : "divider",
                              p: 2,
                              display: "grid",
                              gap: 1.5,
                              minWidth: 240,
                              maxWidth: 300,
                              backgroundColor: "background.paper",
                              boxShadow: isSelected
                                ? "0 16px 30px rgba(37, 99, 235, 0.18)"
                                : "0 12px 30px rgba(15, 23, 42, 0.08)",
                              cursor: draggedStepId === step.id ? "grabbing" : "grab",
                              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                            }}
                          >
                            <Stack direction="row" spacing={1.5} alignItems="flex-start">
                              <Avatar sx={{ bgcolor: "primary.light", color: "primary.main" }}>
                                {stepIconMap[step.type]}
                              </Avatar>
                              <Box sx={{ flex: 1, display: "grid", gap: 1 }}>
                                <Typography variant="overline" color="text.secondary">
                                  Step {index + 1} · {step.label}
                                </Typography>
                                <Typography variant="subtitle1" fontWeight={600}>
                                  {step.title}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {step.detail}
                                </Typography>
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
                            </Stack>
                          </Paper>
                        </Box>
                      );
                    })}
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleOpenStepMenu}
                      sx={{
                        borderRadius: 3,
                        alignSelf: "center",
                        whiteSpace: "nowrap",
                        backgroundColor: "background.paper",
                      }}
                    >
                      Add module
                    </Button>
                  </Box>
                </Box>
                {isStepDetailsOpen ? (
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      p: 2,
                      minHeight: { xs: 220, lg: 360 },
                      backgroundColor: "background.paper",
                      display: "grid",
                      gap: 2,
                      alignContent: "start",
                      boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle1" fontWeight={700}>
                        Step details
                      </Typography>
                      <IconButton
                        aria-label="Close step details"
                        size="small"
                        onClick={() => {
                          setSelectedStepId(null);
                          setIsStepDetailsOpen(false);
                        }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                    {selectedStep ? (
                      <>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ bgcolor: "primary.light", color: "primary.main" }}>
                            {stepIconMap[selectedStep.type]}
                          </Avatar>
                          <Box>
                            <Typography variant="overline" color="text.secondary">
                              {selectedStep.label}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={600}>
                              Step {activeFlow?.steps.findIndex((step) => step.id === selectedStep.id) + 1}
                            </Typography>
                          </Box>
                        </Stack>
                        <TextField
                          label="Title"
                          value={selectedStep.title}
                          onChange={(event) => handleStepChange(selectedStep.id, "title", event.target.value)}
                          size="small"
                        />
                        <TextField
                          label="Details"
                          value={selectedStep.detail}
                          onChange={(event) => handleStepChange(selectedStep.id, "detail", event.target.value)}
                          multiline
                          minRows={3}
                          size="small"
                        />
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          {selectedStep.tags.map((tag) => (
                            <Chip
                              key={`${selectedStep.id}-${tag}`}
                              label={tag}
                              size="small"
                              color={tag.toLowerCase().includes("whatsapp") ? "success" : "default"}
                              variant={tag.toLowerCase().includes("whatsapp") ? "filled" : "outlined"}
                            />
                          ))}
                        </Stack>
                        <Button
                          variant="outlined"
                          color="error"
                          startIcon={<DeleteOutlineIcon />}
                          onClick={() => handleRemoveStep(selectedStep.id)}
                          sx={{ justifySelf: "flex-start" }}
                        >
                          Remove step
                        </Button>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Select a step to view and edit its details.
                      </Typography>
                    )}
                  </Paper>
                ) : (
                  <Paper
                    elevation={0}
                    sx={{
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      p: 1.5,
                      backgroundColor: "background.paper",
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle2" fontWeight={700}>
                        Step details minimized
                      </Typography>
                      <IconButton
                        aria-label="Expand step details"
                        size="small"
                        onClick={() => setIsStepDetailsOpen(true)}
                      >
                        <ExpandMoreIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Paper>
                )}
              </Box>
            </Box>
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

      <Dialog open={isFlowSettingsOpen} onClose={() => setIsFlowSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Flow settings</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, mt: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip
              label={getRunStateLabel(activeFlow?.status ?? "DRAFT")}
              color={getRunStateTone(activeFlow?.status ?? "DRAFT")}
            />
            {activeFlow ? (
              <Chip label={`${getProcessedLeads(activeFlow.id)} leads processed`} variant="outlined" />
            ) : null}
          </Stack>
          <TextField
            label="Flow name"
            value={activeFlow?.name ?? ""}
            onChange={(event) => activeFlow && setActiveFlow({ ...activeFlow, name: event.target.value })}
          />
          <TextField
            label="Description"
            value={activeFlow?.description ?? ""}
            onChange={(event) => activeFlow && setActiveFlow({ ...activeFlow, description: event.target.value })}
            multiline
            minRows={3}
          />
          <Button
            variant="text"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={() => {
              setIsFlowSettingsOpen(false);
              setDeleteOpen(true);
            }}
            sx={{ justifySelf: "flex-start" }}
          >
            Delete flow
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsFlowSettingsOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>

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
