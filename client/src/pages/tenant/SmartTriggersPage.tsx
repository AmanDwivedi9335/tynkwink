import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import BoltIcon from "@mui/icons-material/Bolt";
import ScheduleIcon from "@mui/icons-material/Schedule";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import CircleIcon from "@mui/icons-material/Circle";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { api } from "../../lib/api";

type SmartTriggerStep = {
  id: string;
  label: string;
  title: string;
  detail: string;
  type: "TRIGGER" | "ACTION" | "DELAY" | "DECISION";
  tags: string[];
};

type SmartTriggerFlowSummary = {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  updatedAt: string;
};

type SmartTriggerFlow = SmartTriggerFlowSummary & {
  description?: string | null;
  steps: SmartTriggerStep[];
};

const sequenceTemplates = [
  { value: "welcome", label: "New lead welcome flow" },
  { value: "status", label: "Status change nurture" },
  { value: "revival", label: "Dormant lead revival" },
  { value: "handoff", label: "Sales handoff loop" },
];

const stepTemplates: SmartTriggerStep[] = [
  {
    id: "step-trigger-lead",
    label: "Trigger",
    title: "New lead created",
    detail: "Source: Web form, WhatsApp, or import",
    type: "TRIGGER",
    tags: ["Instant", "Inbound"],
  },
  {
    id: "step-action-whatsapp",
    label: "Action",
    title: "Send WhatsApp message",
    detail: "Template: Welcome + intro",
    type: "ACTION",
    tags: ["WhatsApp", "Template"],
  },
  {
    id: "step-delay",
    label: "Delay",
    title: "Wait 2 hours",
    detail: "Only between 9 AM - 6 PM",
    type: "DELAY",
    tags: ["Delay", "Business hours"],
  },
  {
    id: "step-decision-status",
    label: "Decision",
    title: "Status changed?",
    detail: "Qualified → send brochure",
    type: "DECISION",
    tags: ["Routing", "CRM"],
  },
];

export default function SmartTriggersPage() {
  const [template, setTemplate] = useState("welcome");
  const [flows, setFlows] = useState<SmartTriggerFlowSummary[]>([]);
  const [activeFlow, setActiveFlow] = useState<SmartTriggerFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");

  const defaultFlowSteps = useMemo(
    () =>
      stepTemplates.map((step) => ({
        ...step,
        id: `${step.id}-${crypto.randomUUID()}`,
      })),
    []
  );

  const loadFlow = async (flowId: string) => {
    const response = await api.get<{ flow: SmartTriggerFlow }>(`/api/smart-triggers/${flowId}`);
    setActiveFlow(response.data.flow);
  };

  const loadFlows = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ flows: SmartTriggerFlowSummary[] }>("/api/smart-triggers");
      const fetchedFlows = response.data.flows;
      setFlows(fetchedFlows);

      if (fetchedFlows.length > 0) {
        await loadFlow(fetchedFlows[0].id);
      } else {
        const created = await api.post<{ flow: SmartTriggerFlow }>("/api/smart-triggers", {
          name: "Welcome flow",
          description: "Starter sequence for new leads.",
          steps: defaultFlowSteps,
          status: "DRAFT",
        });
        setFlows([
          {
            id: created.data.flow.id,
            name: created.data.flow.name,
            status: created.data.flow.status,
            updatedAt: created.data.flow.updatedAt,
          },
        ]);
        setActiveFlow(created.data.flow);
      }
    } catch (err) {
      setError("Unable to load smart triggers. Showing local draft.");
      setFlows([
        {
          id: "local-draft",
          name: "Local draft",
          status: "DRAFT",
          updatedAt: new Date().toISOString(),
        },
      ]);
      setActiveFlow({
        id: "local-draft",
        name: "Local draft",
        status: "DRAFT",
        updatedAt: new Date().toISOString(),
        steps: defaultFlowSteps,
        description: "Connect to backend to save.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlows();
  }, []);

  const handleFlowChange = async (flowId: string) => {
    if (flowId === activeFlow?.id) {
      return;
    }
    await loadFlow(flowId);
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

  const handleSave = async (status?: SmartTriggerFlow["status"]) => {
    if (!activeFlow || activeFlow.id === "local-draft") {
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

  const handleCreateFlow = async () => {
    if (!newFlowName.trim()) {
      return;
    }
    const response = await api.post<{ flow: SmartTriggerFlow }>("/api/smart-triggers", {
      name: newFlowName.trim(),
      description: "Custom sequence",
      steps: defaultFlowSteps,
      status: "DRAFT",
    });
    const created = response.data.flow;
    setFlows((prev) => [
      {
        id: created.id,
        name: created.name,
        status: created.status,
        updatedAt: created.updatedAt,
      },
      ...prev,
    ]);
    setActiveFlow(created);
    setNewFlowName("");
    setIsNewDialogOpen(false);
  };

  const stepIconMap: Record<SmartTriggerStep["type"], JSX.Element> = {
    TRIGGER: <BoltIcon fontSize="small" />,
    ACTION: <WhatsAppIcon fontSize="small" />,
    DELAY: <ScheduleIcon fontSize="small" />,
    DECISION: <CallSplitIcon fontSize="small" />,
  };

  const isLocalDraft = activeFlow?.id === "local-draft";

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Smart Triggers
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Build interactive, draggable lead automations with WhatsApp sequences and status-based routing.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="flow-select-label">Flow</InputLabel>
            <Select
              labelId="flow-select-label"
              label="Flow"
              value={activeFlow?.id ?? ""}
              onChange={(event) => handleFlowChange(event.target.value)}
              disabled={loading}
            >
              {flows.map((flow) => (
                <MenuItem key={flow.id} value={flow.id}>
                  {flow.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" sx={{ borderRadius: 2 }} onClick={() => setIsNewDialogOpen(true)}>
            New flow
          </Button>
        </Stack>
      </Box>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: { xs: 2.5, md: 3 },
          display: "grid",
          gap: 2,
          minHeight: { xs: 520, md: "calc(100vh - 240px)" },
          position: "relative",
          backgroundImage: "radial-gradient(rgba(93, 74, 184, 0.12) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Automation canvas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Drag triggers and actions onto the board to build your lead sequence.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Button variant="outlined" onClick={handleOpenStepMenu}>
              Add step
            </Button>
            <Button variant="outlined">Preview</Button>
            <Button
              variant="outlined"
              disabled={!activeFlow || isSaving || isLocalDraft}
              onClick={() => handleSave("DRAFT")}
            >
              {isSaving ? "Saving..." : "Save draft"}
            </Button>
            <Button
              variant="contained"
              disabled={!activeFlow || isSaving || isLocalDraft}
              onClick={() => handleSave("PUBLISHED")}
            >
              Publish flow
            </Button>
          </Stack>
        </Stack>

        {error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : null}

        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 360 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <Stack spacing={2}>
            {activeFlow?.steps.map((step, index) => (
              <Box key={step.id} sx={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 2 }}>
                <Stack spacing={1} alignItems="center">
                  <CircleIcon fontSize="small" color={index === 0 ? "primary" : "disabled"} />
                  {index < activeFlow.steps.length - 1 ? (
                    <Box sx={{ width: 2, flexGrow: 1, bgcolor: "divider" }} />
                  ) : null}
                </Stack>
                <Paper
                  elevation={0}
                  draggable
                  sx={{
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    p: 2,
                    display: "grid",
                    gap: 1,
                    cursor: "grab",
                    backgroundColor: "rgba(255,255,255,0.92)",
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: "primary.light", color: "primary.main" }}>
                      {stepIconMap[step.type]}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="overline" color="text.secondary">
                        {step.label}
                      </Typography>
                      <Typography fontWeight={700}>{step.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {step.detail}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => handleRemoveStep(step.id)}>
                      <DragIndicatorIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Divider />
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
                </Paper>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: 2.5,
          display: "grid",
          gap: 2,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          Lead sequence generator
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose a flow template like wabb.in and customize each step with drag-and-drop actions.
        </Typography>
        <ToggleButtonGroup
          exclusive
          value={template}
          onChange={(_, value) => value && setTemplate(value)}
          sx={{ display: "grid", gap: 1, gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" } }}
        >
          {sequenceTemplates.map((item) => (
            <ToggleButton
              key={item.value}
              value={item.value}
              sx={{
                justifyContent: "space-between",
                textTransform: "none",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography fontWeight={600}>{item.label}</Typography>
              <ArrowForwardIcon fontSize="small" />
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Paper>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleCloseStepMenu}>
        {stepTemplates.map((step) => (
          <MenuItem key={step.id} onClick={() => handleAddStep(step)}>
            {step.title}
          </MenuItem>
        ))}
      </Menu>

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
    </Box>
  );
}
