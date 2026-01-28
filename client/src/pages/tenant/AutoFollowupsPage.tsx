import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
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
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import LaunchIcon from "@mui/icons-material/Launch";
import NorthIcon from "@mui/icons-material/North";
import SouthIcon from "@mui/icons-material/South";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";

type SequenceSummary = {
  id: string;
  name: string;
  description?: string | null;
  triggerType: "MANUAL" | "ON_LEAD_CREATED" | "ON_STAGE_CHANGED";
  triggerConfig: Record<string, any>;
  isActive: boolean;
  stepsCount: number;
  activeEnrollments: number;
  lastRunStatus?: string | null;
  updatedAt: string;
};

type SequenceStepForm = {
  id?: string;
  stepOrder: number;
  delayValue: number;
  delayUnit: "MINUTES" | "HOURS" | "DAYS";
  actionType: "EMAIL" | "WHATSAPP" | "CALL_REMINDER";
  actionConfig: Record<string, any>;
  isEnabled: boolean;
};

type SequenceDetails = {
  id: string;
  name: string;
  description?: string | null;
  triggerType: SequenceSummary["triggerType"];
  triggerConfig: Record<string, any>;
  isActive: boolean;
  steps: SequenceStepForm[];
};

type LeadSummary = {
  id: string;
  personal: { name: string; email?: string; phone?: string };
};

type StageSummary = {
  id: string;
  name: string;
};

type EnrollmentSummary = {
  id: string;
  status: string;
  startedAt: string;
  lead: { id: string; name: string | null; email: string | null; phone: string | null };
};

type LogSummary = {
  id: string;
  status: string;
  actionType: string;
  errorMessage?: string | null;
  createdAt: string;
  enrollment: { lead: { id: string; name: string | null; email: string | null; phone: string | null } };
  job?: { attemptCount: number; maxAttempts: number; status: string };
};

const templateVariables = [
  { label: "Lead name", token: "{{lead.name}}" },
  { label: "Lead email", token: "{{lead.email}}" },
  { label: "Lead phone", token: "{{lead.phone}}" },
  { label: "Owner name", token: "{{owner.name}}" },
  { label: "Owner email", token: "{{owner.email}}" },
  { label: "Tenant name", token: "{{tenant.name}}" },
];

const defaultStep = (order: number): SequenceStepForm => ({
  stepOrder: order,
  delayValue: 10,
  delayUnit: "MINUTES",
  actionType: "EMAIL",
  actionConfig: {
    subject: "Quick hello from {{tenant.name}}",
    body: "Hi {{lead.name}}, thanks for reaching out. We will contact you shortly.",
  },
  isEnabled: true,
});

export default function AutoFollowupsPage() {
  const [sequences, setSequences] = useState<SequenceSummary[]>([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [details, setDetails] = useState<SequenceDetails | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentSummary[]>([]);
  const [logs, setLogs] = useState<LogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [pipelineLeads, setPipelineLeads] = useState<LeadSummary[]>([]);
  const [stages, setStages] = useState<StageSummary[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [gmailIntegrations, setGmailIntegrations] = useState<Array<{ id: string; gmailAddress: string }>>([]);
  const [whatsAppIntegrationId, setWhatsAppIntegrationId] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderState, setBuilderState] = useState<SequenceDetails>({
    id: "",
    name: "",
    description: "",
    triggerType: "MANUAL",
    triggerConfig: {},
    isActive: true,
    steps: [defaultStep(1)],
  });
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadSummary | null>(null);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);

  const appendToken = (value: string | undefined, token: string) => {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) return token;
    return `${value}${value.endsWith(" ") ? "" : " "}${token}`;
  };

  const insertVariableToken = (stepOrder: number, field: string, token: string) => {
    setBuilderState((prev) => ({
      ...prev,
      steps: prev.steps.map((entry) =>
        entry.stepOrder === stepOrder
          ? {
              ...entry,
              actionConfig: {
                ...entry.actionConfig,
                [field]: appendToken(entry.actionConfig[field] ?? "", token),
              },
            }
          : entry
      ),
    }));
  };

  const loadSequences = async () => {
    setLoading(true);
    const response = await api.get<{ sequences: SequenceSummary[] }>("/api/sequences?status=all");
    setSequences(response.data.sequences);
    if (!selectedSequenceId && response.data.sequences.length > 0) {
      setSelectedSequenceId(response.data.sequences[0].id);
    }
    setLoading(false);
  };

  const loadPipeline = async () => {
    const response = await api.get<{ stages: StageSummary[]; leads: LeadSummary[] }>("/api/crm/pipeline");
    setPipelineLeads(response.data.leads);
    setStages(response.data.stages);
  };

  const loadIntegrations = async () => {
    const me = await api.get<{ auth: { tenantId: string | null } }>("/api/me");
    const tid = me.data.auth.tenantId ?? null;
    setTenantId(tid);
    if (!tid) return;
    const gmail = await api.get<{ integrations: Array<{ id: string; gmailAddress: string }> }>(
      `/api/tenants/${tid}/integrations/gmail`
    );
    setGmailIntegrations(gmail.data.integrations ?? []);
    const whatsapp = await api.get<{ integration: { id: string } | null }>(`/api/tenants/${tid}/integrations/whatsapp`);
    setWhatsAppIntegrationId(whatsapp.data.integration?.id ?? null);
  };

  useEffect(() => {
    void loadSequences();
    void loadPipeline();
    void loadIntegrations();
  }, []);

  useEffect(() => {
    if (!selectedSequenceId) return;
    const loadDetails = async () => {
      const [detailRes, enrollRes, logRes] = await Promise.all([
        api.get<{ sequence: SequenceDetails }>(`/api/sequences/${selectedSequenceId}`),
        api.get<{ enrollments: EnrollmentSummary[] }>(`/api/sequences/${selectedSequenceId}/enrollments`),
        api.get<{ logs: LogSummary[] }>(`/api/sequences/${selectedSequenceId}/logs?page=1`),
      ]);
      setDetails(detailRes.data.sequence);
      setEnrollments(enrollRes.data.enrollments);
      setLogs(logRes.data.logs);
    };
    void loadDetails();
  }, [selectedSequenceId]);

  const triggerLabel = (triggerType: SequenceSummary["triggerType"], triggerConfig: Record<string, any>) => {
    if (triggerType === "ON_LEAD_CREATED") return "Lead created";
    if (triggerType === "ON_STAGE_CHANGED") {
      const stageName = stages.find((stage) => stage.id === triggerConfig.stageId)?.name ?? "Stage change";
      return `Stage changed → ${stageName}`;
    }
    return "Manual";
  };

  const resetBuilder = (sequence?: SequenceDetails | null) => {
    if (!sequence) {
      setBuilderState({
        id: "",
        name: "",
        description: "",
        triggerType: "MANUAL",
        triggerConfig: {},
        isActive: true,
        steps: [defaultStep(1)],
      });
      return;
    }
    setBuilderState({
      id: sequence.id,
      name: sequence.name,
      description: sequence.description ?? "",
      triggerType: sequence.triggerType,
      triggerConfig: sequence.triggerConfig ?? {},
      isActive: sequence.isActive,
      steps: sequence.steps.map((step) => ({
        ...step,
        isEnabled: step.isEnabled ?? true,
      })),
    });
  };

  const handleSaveSequence = async () => {
    if (!builderState.name.trim()) return;
    if (builderState.triggerType === "ON_STAGE_CHANGED" && !builderState.triggerConfig.stageId) return;
    if (!builderState.steps.length) return;

    if (!builderState.id) {
      await api.post("/api/sequences", {
        name: builderState.name,
        description: builderState.description,
        triggerType: builderState.triggerType,
        triggerConfig: builderState.triggerConfig,
        steps: builderState.steps,
      });
    } else {
      await api.put(`/api/sequences/${builderState.id}`, {
        name: builderState.name,
        description: builderState.description,
        triggerType: builderState.triggerType,
        triggerConfig: builderState.triggerConfig,
      });
      await api.put(`/api/sequences/${builderState.id}/steps`, {
        steps: builderState.steps,
      });
    }

    setBuilderOpen(false);
    await loadSequences();
  };

  const handleToggleSequence = async (sequence: SequenceSummary) => {
    await api.post(`/api/sequences/${sequence.id}/toggle`, { isActive: !sequence.isActive });
    await loadSequences();
  };

  const handleEnrollLead = async () => {
    if (!selectedSequenceId || !selectedLead) return;
    await api.post(`/api/sequences/${selectedSequenceId}/enroll`, { leadId: selectedLead.id });
    setEnrollDialogOpen(false);
    setSelectedLead(null);
    if (selectedSequenceId) {
      const enrollRes = await api.get<{ enrollments: EnrollmentSummary[] }>(
        `/api/sequences/${selectedSequenceId}/enrollments`
      );
      setEnrollments(enrollRes.data.enrollments);
    }
  };

  const handleOpenLogs = async () => {
    if (!selectedSequenceId) return;
    const logRes = await api.get<{ logs: LogSummary[] }>(`/api/sequences/${selectedSequenceId}/logs?page=1`);
    setLogs(logRes.data.logs);
    setLogsDialogOpen(true);
  };

  const stepOrders = useMemo(() => builderState.steps.map((step) => step.stepOrder), [builderState.steps]);

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Auto Followups / Sequences
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Automate multi-step follow-ups across email, WhatsApp, and call reminders.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            sx={{ borderRadius: 2 }}
            onClick={() => {
              resetBuilder(null);
              setBuilderOpen(true);
            }}
            startIcon={<AddIcon />}
          >
            New sequence
          </Button>
          {details ? (
            <Button
              variant="contained"
              sx={{ borderRadius: 2 }}
              startIcon={<EditIcon />}
              onClick={() => {
                resetBuilder(details);
                setBuilderOpen(true);
              }}
            >
              Edit sequence
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" } }}>
        <Paper
          elevation={0}
          sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 3, display: "grid", gap: 2 }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              Sequence library
            </Typography>
            <Chip label={`${sequences.length} sequences`} size="small" variant="outlined" />
          </Stack>
          <Divider />
          {loading ? (
            <Typography color="text.secondary">Loading sequences...</Typography>
          ) : sequences.length === 0 ? (
            <Typography color="text.secondary">Create your first follow-up sequence.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Trigger</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell>Steps</TableCell>
                  <TableCell>Active enrollments</TableCell>
                  <TableCell>Last run</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sequences.map((sequence) => (
                  <TableRow
                    key={sequence.id}
                    hover
                    selected={sequence.id === selectedSequenceId}
                    onClick={() => setSelectedSequenceId(sequence.id)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>{sequence.name}</TableCell>
                    <TableCell>{triggerLabel(sequence.triggerType, sequence.triggerConfig)}</TableCell>
                    <TableCell>
                      <Chip
                        label={sequence.isActive ? "Active" : "Paused"}
                        color={sequence.isActive ? "success" : "default"}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{sequence.stepsCount}</TableCell>
                    <TableCell>{sequence.activeEnrollments}</TableCell>
                    <TableCell>{sequence.lastRunStatus ?? "—"}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleToggleSequence(sequence)}>
                        {sequence.isActive ? <PauseCircleOutlineIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          resetBuilder(details?.id === sequence.id ? details : null);
                          setSelectedSequenceId(sequence.id);
                          setBuilderOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Paper>

        <Paper
          elevation={0}
          sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider", p: 3, display: "grid", gap: 2 }}
        >
          <Typography variant="h6" fontWeight={700}>
            Sequence details
          </Typography>
          {details ? (
            <Stack spacing={2}>
              <Box>
                <Typography fontWeight={700}>{details.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {details.description || "No description provided"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Trigger: {triggerLabel(details.triggerType, details.triggerConfig)}
                </Typography>
              </Box>
              <Divider />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={600}>Enrollments</Typography>
                <Button size="small" variant="outlined" onClick={() => setEnrollDialogOpen(true)}>
                  Enroll lead
                </Button>
              </Stack>
              {enrollments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No active enrollments yet.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {enrollments.slice(0, 5).map((enrollment) => (
                    <Paper key={enrollment.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Typography fontWeight={600}>{enrollment.lead.name ?? "Unnamed lead"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {enrollment.lead.email ?? enrollment.lead.phone ?? "No contact info"} · {enrollment.status}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              )}
              <Divider />
              <Typography fontWeight={600}>Recent execution logs</Typography>
              {logs.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No executions yet.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {logs.slice(0, 4).map((log) => (
                    <Paper key={log.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight={600}>
                          {log.enrollment.lead.name ?? "Lead"} · {log.actionType}
                        </Typography>
                        <Chip
                          size="small"
                          label={log.status}
                          color={log.status === "SUCCESS" ? "success" : "error"}
                          variant="outlined"
                        />
                      </Stack>
                      {log.errorMessage ? (
                        <Typography variant="caption" color="error">
                          {log.errorMessage}
                          {log.job ? ` · Retries ${log.job.attemptCount}/${log.job.maxAttempts}` : ""}
                        </Typography>
                      ) : null}
                    </Paper>
                  ))}
                </Stack>
              )}
              <Button
                size="small"
                endIcon={<LaunchIcon />}
                onClick={handleOpenLogs}
              >
                View full logs
              </Button>
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Select a sequence to see enrollments and execution history.
            </Typography>
          )}
        </Paper>
      </Box>

      <Dialog open={builderOpen} onClose={() => setBuilderOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{builderState.id ? "Edit sequence" : "Create sequence"}</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
          <TextField
            label="Sequence name"
            value={builderState.name}
            onChange={(event) => setBuilderState((prev) => ({ ...prev, name: event.target.value }))}
            fullWidth
          />
          <TextField
            label="Description"
            value={builderState.description}
            onChange={(event) => setBuilderState((prev) => ({ ...prev, description: event.target.value }))}
            fullWidth
          />
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Trigger</InputLabel>
              <Select
                label="Trigger"
                value={builderState.triggerType}
                onChange={(event) =>
                  setBuilderState((prev) => ({ ...prev, triggerType: event.target.value as any }))
                }
              >
                <MenuItem value="MANUAL">Manual enrollment</MenuItem>
                <MenuItem value="ON_LEAD_CREATED">On lead created</MenuItem>
                <MenuItem value="ON_STAGE_CHANGED">On stage changed</MenuItem>
              </Select>
            </FormControl>
            {builderState.triggerType === "ON_STAGE_CHANGED" ? (
              <FormControl fullWidth>
                <InputLabel>Stage</InputLabel>
                <Select
                  label="Stage"
                  value={builderState.triggerConfig.stageId ?? ""}
                  onChange={(event) =>
                    setBuilderState((prev) => ({
                      ...prev,
                      triggerConfig: { ...prev.triggerConfig, stageId: event.target.value },
                    }))
                  }
                >
                  {stages.map((stage) => (
                    <MenuItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : null}
          </Stack>
          <Divider />
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={700}>Steps</Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() =>
                setBuilderState((prev) => ({
                  ...prev,
                  steps: [...prev.steps, defaultStep(prev.steps.length + 1)],
                }))
              }
            >
              Add step
            </Button>
          </Stack>
          <Stack spacing={2}>
            {builderState.steps.map((step, index) => (
              <Paper key={step.stepOrder} variant="outlined" sx={{ p: 2, borderRadius: 2, display: "grid", gap: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography fontWeight={600}>Step {step.stepOrder}</Typography>
                  <IconButton
                    size="small"
                    disabled={index === 0}
                    onClick={() =>
                      setBuilderState((prev) => {
                        const next = [...prev.steps];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        return {
                          ...prev,
                          steps: next.map((entry, idx) => ({ ...entry, stepOrder: idx + 1 })),
                        };
                      })
                    }
                  >
                    <NorthIcon fontSize="inherit" />
                  </IconButton>
                  <IconButton
                    size="small"
                    disabled={index === builderState.steps.length - 1}
                    onClick={() =>
                      setBuilderState((prev) => {
                        const next = [...prev.steps];
                        [next[index + 1], next[index]] = [next[index], next[index + 1]];
                        return {
                          ...prev,
                          steps: next.map((entry, idx) => ({ ...entry, stepOrder: idx + 1 })),
                        };
                      })
                    }
                  >
                    <SouthIcon fontSize="inherit" />
                  </IconButton>
                </Stack>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    label="Delay value"
                    type="number"
                    value={step.delayValue}
                    onChange={(event) =>
                      setBuilderState((prev) => ({
                        ...prev,
                        steps: prev.steps.map((entry) =>
                          entry.stepOrder === step.stepOrder
                            ? { ...entry, delayValue: Number(event.target.value) }
                            : entry
                        ),
                      }))
                    }
                  />
                  <FormControl sx={{ minWidth: 160 }}>
                    <InputLabel>Delay unit</InputLabel>
                    <Select
                      label="Delay unit"
                      value={step.delayUnit}
                      onChange={(event) =>
                        setBuilderState((prev) => ({
                          ...prev,
                          steps: prev.steps.map((entry) =>
                            entry.stepOrder === step.stepOrder
                              ? { ...entry, delayUnit: event.target.value as any }
                              : entry
                          ),
                        }))
                      }
                    >
                      <MenuItem value="MINUTES">Minutes</MenuItem>
                      <MenuItem value="HOURS">Hours</MenuItem>
                      <MenuItem value="DAYS">Days</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Action</InputLabel>
                    <Select
                      label="Action"
                      value={step.actionType}
                      onChange={(event) =>
                        setBuilderState((prev) => ({
                          ...prev,
                          steps: prev.steps.map((entry) =>
                            entry.stepOrder === step.stepOrder
                              ? {
                                  ...entry,
                                  actionType: event.target.value as any,
                                  actionConfig:
                                    event.target.value === "EMAIL"
                                      ? { subject: "", body: "", fromAccountId: "" }
                                      : event.target.value === "WHATSAPP"
                                        ? { messageText: "", fromWhatsAppAccountId: whatsAppIntegrationId ?? "" }
                                        : { title: "", description: "", assignTo: "leadOwner" },
                                }
                              : entry
                          ),
                        }))
                      }
                    >
                      <MenuItem value="EMAIL">Send Email</MenuItem>
                      <MenuItem value="WHATSAPP">Send WhatsApp</MenuItem>
                      <MenuItem value="CALL_REMINDER">Create Call Reminder</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Enabled</InputLabel>
                    <Select
                      label="Enabled"
                      value={step.isEnabled ? "yes" : "no"}
                      onChange={(event) =>
                        setBuilderState((prev) => ({
                          ...prev,
                          steps: prev.steps.map((entry) =>
                            entry.stepOrder === step.stepOrder
                              ? { ...entry, isEnabled: event.target.value === "yes" }
                              : entry
                          ),
                        }))
                      }
                    >
                      <MenuItem value="yes">Yes</MenuItem>
                      <MenuItem value="no">No</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
                {step.actionType === "EMAIL" ? (
                  <Stack spacing={2}>
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        Variable suggestions
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {templateVariables.map((variable) => (
                          <Chip
                            key={`${step.stepOrder}-email-${variable.token}`}
                            label={variable.label}
                            size="small"
                            variant="outlined"
                            onClick={() => insertVariableToken(step.stepOrder, "subject", variable.token)}
                          />
                        ))}
                      </Stack>
                    </Stack>
                    <TextField
                      label="Subject"
                      value={step.actionConfig.subject ?? ""}
                      onChange={(event) =>
                        setBuilderState((prev) => ({
                          ...prev,
                          steps: prev.steps.map((entry) =>
                            entry.stepOrder === step.stepOrder
                              ? { ...entry, actionConfig: { ...entry.actionConfig, subject: event.target.value } }
                              : entry
                          ),
                        }))
                      }
                      fullWidth
                    />
                    <TextField
                      label="Body"
                      value={step.actionConfig.body ?? ""}
                      onChange={(event) =>
                        setBuilderState((prev) => ({
                          ...prev,
                          steps: prev.steps.map((entry) =>
                            entry.stepOrder === step.stepOrder
                              ? { ...entry, actionConfig: { ...entry.actionConfig, body: event.target.value } }
                              : entry
                          ),
                        }))
                      }
                      fullWidth
                      multiline
                      rows={3}
                    />
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        Message variables
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {templateVariables.map((variable) => (
                          <Chip
                            key={`${step.stepOrder}-email-body-${variable.token}`}
                            label={variable.token}
                            size="small"
                            variant="outlined"
                            onClick={() => insertVariableToken(step.stepOrder, "body", variable.token)}
                          />
                        ))}
                      </Stack>
                    </Stack>
                    <FormControl fullWidth>
                      <InputLabel>Email account</InputLabel>
                      <Select
                        label="Email account"
                        value={step.actionConfig.fromAccountId ?? ""}
                        onChange={(event) =>
                          setBuilderState((prev) => ({
                            ...prev,
                            steps: prev.steps.map((entry) =>
                              entry.stepOrder === step.stepOrder
                                ? { ...entry, actionConfig: { ...entry.actionConfig, fromAccountId: event.target.value } }
                                : entry
                            ),
                          }))
                        }
                      >
                        {gmailIntegrations.map((integration) => (
                          <MenuItem key={integration.id} value={integration.id}>
                            {integration.gmailAddress}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                ) : null}
                {step.actionType === "WHATSAPP" ? (
                  <Stack spacing={2}>
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        Message variables
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {templateVariables.map((variable) => (
                          <Chip
                            key={`${step.stepOrder}-whatsapp-${variable.token}`}
                            label={variable.label}
                            size="small"
                            variant="outlined"
                            onClick={() => insertVariableToken(step.stepOrder, "messageText", variable.token)}
                          />
                        ))}
                      </Stack>
                    </Stack>
                    <TextField
                      label="Message text"
                      value={step.actionConfig.messageText ?? ""}
                      onChange={(event) =>
                        setBuilderState((prev) => ({
                          ...prev,
                          steps: prev.steps.map((entry) =>
                            entry.stepOrder === step.stepOrder
                              ? { ...entry, actionConfig: { ...entry.actionConfig, messageText: event.target.value } }
                              : entry
                          ),
                        }))
                      }
                      fullWidth
                      multiline
                      rows={3}
                    />
                    {whatsAppIntegrationId ? (
                      <Typography variant="caption" color="text.secondary">
                        Using WhatsApp integration {whatsAppIntegrationId.slice(0, 6)}…
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="error">
                        No WhatsApp integration connected.
                      </Typography>
                    )}
                  </Stack>
                ) : null}
                {step.actionType === "CALL_REMINDER" ? (
                  <Stack spacing={2}>
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        Reminder variables
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {templateVariables.map((variable) => (
                          <Chip
                            key={`${step.stepOrder}-call-${variable.token}`}
                            label={variable.label}
                            size="small"
                            variant="outlined"
                            onClick={() => insertVariableToken(step.stepOrder, "title", variable.token)}
                          />
                        ))}
                      </Stack>
                    </Stack>
                    <TextField
                      label="Title"
                      value={step.actionConfig.title ?? ""}
                      onChange={(event) =>
                        setBuilderState((prev) => ({
                          ...prev,
                          steps: prev.steps.map((entry) =>
                            entry.stepOrder === step.stepOrder
                              ? { ...entry, actionConfig: { ...entry.actionConfig, title: event.target.value } }
                              : entry
                          ),
                        }))
                      }
                      fullWidth
                    />
                    <TextField
                      label="Description"
                      value={step.actionConfig.description ?? ""}
                      onChange={(event) =>
                        setBuilderState((prev) => ({
                          ...prev,
                          steps: prev.steps.map((entry) =>
                            entry.stepOrder === step.stepOrder
                              ? { ...entry, actionConfig: { ...entry.actionConfig, description: event.target.value } }
                              : entry
                          ),
                        }))
                      }
                      fullWidth
                      multiline
                      rows={2}
                    />
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        Description variables
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {templateVariables.map((variable) => (
                          <Chip
                            key={`${step.stepOrder}-call-desc-${variable.token}`}
                            label={variable.token}
                            size="small"
                            variant="outlined"
                            onClick={() => insertVariableToken(step.stepOrder, "description", variable.token)}
                          />
                        ))}
                      </Stack>
                    </Stack>
                    <FormControl fullWidth>
                      <InputLabel>Assign to</InputLabel>
                      <Select
                        label="Assign to"
                        value={step.actionConfig.assignTo ?? "leadOwner"}
                        onChange={(event) =>
                          setBuilderState((prev) => ({
                            ...prev,
                            steps: prev.steps.map((entry) =>
                              entry.stepOrder === step.stepOrder
                                ? { ...entry, actionConfig: { ...entry.actionConfig, assignTo: event.target.value } }
                                : entry
                            ),
                          }))
                        }
                      >
                        <MenuItem value="leadOwner">Lead owner</MenuItem>
                        <MenuItem value="specificUserId">Specific user</MenuItem>
                      </Select>
                    </FormControl>
                    {step.actionConfig.assignTo === "specificUserId" ? (
                      <TextField
                        label="Assignee user ID"
                        value={step.actionConfig.assigneeId ?? ""}
                        onChange={(event) =>
                          setBuilderState((prev) => ({
                            ...prev,
                            steps: prev.steps.map((entry) =>
                              entry.stepOrder === step.stepOrder
                                ? { ...entry, actionConfig: { ...entry.actionConfig, assigneeId: event.target.value } }
                                : entry
                            ),
                          }))
                        }
                        fullWidth
                      />
                    ) : null}
                  </Stack>
                ) : null}
              </Paper>
            ))}
          </Stack>
          {stepOrders.length !== new Set(stepOrders).size ? (
            <Typography color="error">Step order must be unique.</Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBuilderOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSequence}>
            Save sequence
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={enrollDialogOpen} onClose={() => setEnrollDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enroll lead</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
          <Autocomplete
            options={pipelineLeads}
            getOptionLabel={(option) => option.personal.name || option.personal.email || option.personal.phone || option.id}
            value={selectedLead}
            onChange={(_event, value) => setSelectedLead(value)}
            renderInput={(params) => <TextField {...params} label="Select lead" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnrollDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEnrollLead}>
            Enroll
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={logsDialogOpen} onClose={() => setLogsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Execution logs</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {logs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No logs to show.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Lead</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Error</TableCell>
                  <TableCell>Retries</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.enrollment.lead.name ?? "Lead"}</TableCell>
                    <TableCell>{log.actionType}</TableCell>
                    <TableCell>{log.status}</TableCell>
                  <TableCell>{log.errorMessage ?? "—"}</TableCell>
                  <TableCell>{log.job ? `${log.job.attemptCount}/${log.job.maxAttempts}` : "—"}</TableCell>
                  <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
