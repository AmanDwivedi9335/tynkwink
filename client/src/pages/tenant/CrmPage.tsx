import {
  Box,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../../lib/api";

type CrmStage = {
  id: string;
  name: string;
  color: string;
};

type CrmLead = {
  id: string;
  stageId: string;
  assigneeId?: string | null;
  personal: {
    name: string;
    phone: string;
    email: string;
  };
  company: {
    name: string;
    size: string;
    location: string;
  };
  notes: string;
  autoFollowUp: {
    sequence: string;
    nextStep: string;
  };
  callTracker: {
    lastCall: string;
    outcome: string;
    attempts: number;
  };
  nextReminder: string;
  daysInStage: number;
};

type CrmPipelineResponse = {
  stages: CrmStage[];
  leads: CrmLead[];
};

type StaffMember = {
  id: string;
  role: string;
  isActive: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  };
};

const fallbackPipeline: CrmPipelineResponse = {
  stages: [
    { id: "stage-new", name: "New Lead", color: "#f59e0b" },
    { id: "stage-qualified", name: "Qualified", color: "#3b82f6" },
    { id: "stage-conversation", name: "In Conversation", color: "#a855f7" },
    { id: "stage-good", name: "Good Lead", color: "#22c55e" },
    { id: "stage-won", name: "Lead Won", color: "#ef4444" },
    { id: "stage-no-response", name: "No Response", color: "#6366f1" },
    { id: "stage-deleted", name: "Deleted", color: "#06b6d4" },
  ],
  leads: [
    {
      id: "LD-1024",
      stageId: "stage-new",
      assigneeId: "assignee-1",
      personal: {
        name: "Simran Kaur",
        phone: "+91 99112 77890",
        email: "simran.kaur@example.com",
      },
      company: {
        name: "Kaur Wellness",
        size: "11-50",
        location: "Chandigarh",
      },
      notes: "Requested a product walkthrough for their sales team.",
      autoFollowUp: {
        sequence: "Warm Leads - Week 1",
        nextStep: "Send WhatsApp follow-up",
      },
      callTracker: {
        lastCall: "2 days ago",
        outcome: "Callback requested",
        attempts: 2,
      },
      nextReminder: "Today, 3:30 PM",
      daysInStage: 2,
    },
    {
      id: "LD-1028",
      stageId: "stage-new",
      assigneeId: "assignee-2",
      personal: {
        name: "Manish Tiwari",
        phone: "+91 98340 11209",
        email: "manish.tiwari@example.com",
      },
      company: {
        name: "Tiwari Textiles",
        size: "51-200",
        location: "Jaipur",
      },
      notes: "Needs pricing sheet and ROI case study.",
      autoFollowUp: {
        sequence: "Pricing Interest",
        nextStep: "Email pricing brochure",
      },
      callTracker: {
        lastCall: "Yesterday",
        outcome: "Discussed pricing",
        attempts: 1,
      },
      nextReminder: "Tomorrow, 10:00 AM",
      daysInStage: 1,
    },
    {
      id: "LD-1031",
      stageId: "stage-qualified",
      assigneeId: "assignee-3",
      personal: {
        name: "Karan Sethi",
        phone: "+91 98765 44120",
        email: "karan.sethi@example.com",
      },
      company: {
        name: "Sethi Logistics",
        size: "201-500",
        location: "Delhi",
      },
      notes: "Operations team shortlisted top vendors.",
      autoFollowUp: {
        sequence: "Qualified - Ops",
        nextStep: "Share implementation timeline",
      },
      callTracker: {
        lastCall: "3 days ago",
        outcome: "Awaiting team feedback",
        attempts: 3,
      },
      nextReminder: "Friday, 11:00 AM",
      daysInStage: 4,
    },
    {
      id: "LD-1033",
      stageId: "stage-conversation",
      assigneeId: "assignee-2",
      personal: {
        name: "Aisha Sharma",
        phone: "+91 99988 33441",
        email: "aisha.sharma@example.com",
      },
      company: {
        name: "Sharma Studios",
        size: "1-10",
        location: "Mumbai",
      },
      notes: "Interested in WhatsApp automation for campaigns.",
      autoFollowUp: {
        sequence: "Discovery",
        nextStep: "Schedule demo recap",
      },
      callTracker: {
        lastCall: "5 days ago",
        outcome: "Demo completed",
        attempts: 2,
      },
      nextReminder: "Monday, 9:00 AM",
      daysInStage: 6,
    },
    {
      id: "LD-1040",
      stageId: "stage-good",
      assigneeId: "assignee-4",
      personal: {
        name: "Nitin Verma",
        phone: "+91 98220 55110",
        email: "nitin.verma@example.com",
      },
      company: {
        name: "Verma Automotives",
        size: "501-1000",
        location: "Pune",
      },
      notes: "Ready for pilot proposal; needs security checklist.",
      autoFollowUp: {
        sequence: "Proposal",
        nextStep: "Send pilot proposal",
      },
      callTracker: {
        lastCall: "Today",
        outcome: "Proposal requested",
        attempts: 4,
      },
      nextReminder: "Today, 6:00 PM",
      daysInStage: 8,
    },
    {
      id: "LD-1044",
      stageId: "stage-won",
      assigneeId: "assignee-1",
      personal: {
        name: "Priya Nair",
        phone: "+91 99001 22011",
        email: "priya.nair@example.com",
      },
      company: {
        name: "Nair Hospitality",
        size: "51-200",
        location: "Kochi",
      },
      notes: "Contract signed; onboarding kickoff scheduled.",
      autoFollowUp: {
        sequence: "Onboarding",
        nextStep: "Share onboarding checklist",
      },
      callTracker: {
        lastCall: "1 week ago",
        outcome: "Contract signed",
        attempts: 5,
      },
      nextReminder: "Next Wednesday, 2:00 PM",
      daysInStage: 12,
    },
    {
      id: "LD-1048",
      stageId: "stage-no-response",
      assigneeId: "assignee-3",
      personal: {
        name: "Rohan Das",
        phone: "+91 98110 45567",
        email: "rohan.das@example.com",
      },
      company: {
        name: "Das Retail",
        size: "11-50",
        location: "Kolkata",
      },
      notes: "No response to last 2 follow-ups.",
      autoFollowUp: {
        sequence: "Re-engagement",
        nextStep: "Send last touch email",
      },
      callTracker: {
        lastCall: "10 days ago",
        outcome: "No answer",
        attempts: 4,
      },
      nextReminder: "Friday, 4:00 PM",
      daysInStage: 10,
    },
    {
      id: "LD-1052",
      stageId: "stage-deleted",
      assigneeId: null,
      personal: {
        name: "Meera Kapoor",
        phone: "+91 98088 66770",
        email: "meera.kapoor@example.com",
      },
      company: {
        name: "Kapoor Interiors",
        size: "1-10",
        location: "Delhi",
      },
      notes: "Out of scope for current offering.",
      autoFollowUp: {
        sequence: "Closed",
        nextStep: "Archive record",
      },
      callTracker: {
        lastCall: "2 weeks ago",
        outcome: "Not a fit",
        attempts: 2,
      },
      nextReminder: "N/A",
      daysInStage: 14,
    },
  ],
};

const columns = [
  { label: "ID", minWidth: 90 },
  { label: "Personal Details", minWidth: 220 },
  { label: "Additional Info", minWidth: 240 },
  { label: "Assigned To", minWidth: 220 },
  { label: "Notes", minWidth: 240 },
  { label: "Auto Follow-up", minWidth: 220 },
  { label: "Call Tracker", minWidth: 200 },
  { label: "Next Reminder", minWidth: 160 },
  { label: "Days in Stage", minWidth: 140 },
  { label: "Actions", minWidth: 180 },
];

const formatLeadNotes = (notes: string) => {
  if (!notes?.trim()) {
    return ["—"];
  }

  const normalized = notes.replace(/<br\s*\/?>/gi, "\n");
  const lines = normalized
    .split("\n")
    .flatMap((line) => line.split("|"))
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/\s*:\s*/g, ": "));

  return lines.length ? lines : ["—"];
};

export default function CrmPage() {
  const [pipeline, setPipeline] = useState<CrmPipelineResponse | null>(null);
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [addLeadError, setAddLeadError] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    createdAt: "",
    stageId: "",
    notes: "",
    assigneeId: "",
  });

  useEffect(() => {
    let isMounted = true;
    api
      .get<CrmPipelineResponse>("/api/crm/pipeline")
      .then((response) => {
        if (!isMounted) return;
        setPipeline(response.data);
        setLeads(response.data.leads);
        setSelectedStageId(response.data.stages[0]?.id ?? null);
      })
      .catch(() => {
        if (!isMounted) return;
        setPipeline(fallbackPipeline);
        setLeads(fallbackPipeline.leads);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const stages = pipeline?.stages ?? [];
  const assignees = useMemo(
    () =>
      staff
        .filter((member) => member.isActive && member.user.isActive)
        .map((member) => ({
          id: member.user.id,
          name: member.user.name,
          role: member.role,
        })),
    [staff]
  );

  useEffect(() => {
    let isMounted = true;
    api
      .get("/api/staff")
      .then((response) => {
        if (!isMounted) return;
        setStaff(response.data.staff ?? []);
      })
      .catch(() => {
        if (!isMounted) return;
        setStaff([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const stageCounts = useMemo(() => {
    return stages.reduce<Record<string, number>>((acc, stage) => {
      acc[stage.id] = leads.filter((lead) => lead.stageId === stage.id).length;
      return acc;
    }, {});
  }, [stages, leads]);

  const filteredLeads = useMemo(() => {
    if (!selectedStageId) return [];
    return leads.filter((lead) => {
      const inStage = lead.stageId === selectedStageId;
      const searchValue = search.trim().toLowerCase();
      if (!searchValue) return inStage;
      const matches =
        lead.personal.name.toLowerCase().includes(searchValue) ||
        lead.personal.email.toLowerCase().includes(searchValue) ||
        lead.personal.phone.toLowerCase().includes(searchValue) ||
        lead.company.name.toLowerCase().includes(searchValue);
      return inStage && matches;
    });
  }, [leads, search, selectedStageId]);

  const handleStageChange = (leadId: string, nextStageId: string) => {
    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, stageId: nextStageId } : lead))
    );
  };

  const handleAssigneeChange = (leadId: string, nextAssigneeId: string) => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === leadId ? { ...lead, assigneeId: nextAssigneeId || null } : lead
      )
    );
  };

  const handleOpenAddLead = () => {
    setAddLeadError(null);
    setLeadForm({
      name: "",
      phone: "",
      email: "",
      company: "",
      createdAt: "",
      stageId: selectedStageId ?? stages[0]?.id ?? "",
      notes: "",
      assigneeId: "",
    });
    setIsAddLeadOpen(true);
  };

  const handleCloseAddLead = () => {
    if (isSubmittingLead) return;
    setIsAddLeadOpen(false);
  };

  const handleAddLeadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddLeadError(null);

    if (!leadForm.name.trim()) {
      setAddLeadError("Lead name is required.");
      return;
    }

    setIsSubmittingLead(true);

    try {
      const payload = {
        name: leadForm.name.trim(),
        phone: leadForm.phone.trim() || undefined,
        email: leadForm.email.trim() || undefined,
        company: leadForm.company.trim() || undefined,
        createdAt: leadForm.createdAt || undefined,
        stageId: leadForm.stageId || undefined,
        notes: leadForm.notes.trim() || undefined,
      };

      const response = await api.post<{ lead: CrmLead }>("/api/crm/leads", payload);
      const newLead = {
        ...response.data.lead,
        assigneeId: leadForm.assigneeId || null,
      };
      setLeads((prev) => [newLead, ...prev]);
      if (!selectedStageId) {
        setSelectedStageId(response.data.lead.stageId);
      }
      setIsAddLeadOpen(false);
    } catch (error: any) {
      const message = error?.response?.data?.message ?? "Unable to add lead.";
      setAddLeadError(message);
    } finally {
      setIsSubmittingLead(false);
    }
  };

  return (
    <Box sx={{ display: "grid", gap: 3 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            CRM
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage leads, conversations, and follow-ups in one place.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<PlayCircleOutlineIcon />}
          sx={{
            borderRadius: 999,
            textTransform: "none",
            fontWeight: 600,
            alignSelf: { xs: "stretch", sm: "flex-start" },
            whiteSpace: "nowrap",
          }}
        >
          Watch Tutorial
        </Button>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: 3,
          display: "grid",
          gap: 2.5,
        }}
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", lg: "center" }}
        >
          <TextField
            fullWidth
            placeholder="Search leads"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{
              backgroundColor: "background.paper",
              borderRadius: 999,
              flex: 1,
              minWidth: { xs: "100%", md: 320 },
            }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterAltOutlinedIcon />}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              width: { xs: "100%", sm: "auto" },
              whiteSpace: "nowrap",
            }}
          >
            Filters
          </Button>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            flexWrap="wrap"
            justifyContent={{ xs: "stretch", sm: "flex-end" }}
            sx={{ width: { xs: "100%", lg: "auto" } }}
          >
            <Button
              variant="outlined"
              sx={{ borderRadius: 2, textTransform: "none", width: { xs: "100%", sm: "auto" } }}
            >
              Call Reminders
            </Button>
            <Button
              variant="outlined"
              sx={{ borderRadius: 2, textTransform: "none", width: { xs: "100%", sm: "auto" } }}
            >
              Import Leads
            </Button>
            <Button
              variant="contained"
              sx={{
                borderRadius: 2,
                fontWeight: 700,
                textTransform: "none",
                width: { xs: "100%", sm: "auto" },
              }}
              onClick={handleOpenAddLead}
            >
              + Add New Lead
            </Button>
          </Stack>
        </Stack>

        <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", pb: 1 }}>
          {stages.map((stage, index) => {
            const isSelected = stage.id === selectedStageId;
            const isLast = index === stages.length - 1;
            return (
              <Button
                key={stage.id}
                onClick={() => setSelectedStageId(stage.id)}
                sx={{
                  minWidth: 180,
                  px: 2.5,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: "none",
                  backgroundColor: stage.color,
                  color: "common.white",
                  fontWeight: 700,
                  boxShadow: isSelected ? "0 10px 25px rgba(15, 23, 42, 0.2)" : "none",
                  position: "relative",
                  overflow: "hidden",
                  ...(isLast
                    ? {}
                    : {
                        "&::after": {
                          content: '""',
                          position: "absolute",
                          top: 0,
                          right: -16,
                          width: 32,
                          height: "100%",
                          backgroundColor: stage.color,
                          clipPath: "polygon(0 0, 100% 50%, 0 100%, 0 0)",
                        },
                      }),
                }}
              >
                <Stack spacing={0.5} alignItems="flex-start">
                  <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1 }}>
                    {stageCounts[stage.id] ?? 0}
                  </Typography>
                  <Typography variant="body2">{stage.name}</Typography>
                </Stack>
              </Button>
            );
          })}
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
          p: 3,
          display: "grid",
          gap: 2,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {stages.find((stage) => stage.id === selectedStageId)?.name ?? "Stage details"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click on a stage above to view its lead details.
            </Typography>
          </Box>
          <Chip
            label={`${filteredLeads.length} leads`}
            variant="outlined"
            sx={{ fontWeight: 600, borderRadius: 999 }}
          />
        </Stack>
        <Divider />
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table sx={{ minWidth: 1400 }}>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column.label} sx={{ minWidth: column.minWidth, fontWeight: 700 }}>
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLeads.map((lead) => {
                const assignee = assignees.find((item) => item.id === lead.assigneeId);
                const formattedNotes = formatLeadNotes(lead.notes);
                return (
                  <TableRow key={lead.id} hover>
                  <TableCell>
                    <Typography fontWeight={700}>{lead.id}</Typography>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={600}>{lead.personal.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {lead.personal.email || "—"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {lead.personal.phone || "—"}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={600}>{lead.company.name || "—"}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {[lead.company.size, lead.company.location].filter(Boolean).join(" • ") || "—"}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={1}>
                      <Box>
                        <Typography fontWeight={600}>{assignee?.name ?? "Unassigned"}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {assignee?.role ?? "—"}
                        </Typography>
                      </Box>
                      <Select
                        size="small"
                        displayEmpty
                        value={lead.assigneeId ?? ""}
                        onChange={(event) => handleAssigneeChange(lead.id, event.target.value)}
                        sx={{ minWidth: 180, borderRadius: 2 }}
                      >
                        <MenuItem value="">
                          <em>Unassigned</em>
                        </MenuItem>
                        {assignees.map((assignee) => (
                          <MenuItem key={assignee.id} value={assignee.id}>
                            {assignee.name} ({assignee.role})
                          </MenuItem>
                        ))}
                      </Select>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.25}>
                      {formattedNotes.map((noteLine, index) => (
                        <Typography
                          key={`${lead.id}-note-${index}`}
                          variant="body2"
                          color="text.secondary"
                        >
                          {formattedNotes.length > 1 ? `• ${noteLine}` : noteLine}
                        </Typography>
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={600}>{lead.autoFollowUp.sequence}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Next: {lead.autoFollowUp.nextStep}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography fontWeight={600}>{lead.callTracker.outcome}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Last call {lead.callTracker.lastCall}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Attempts: {lead.callTracker.attempts}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={600}>{lead.nextReminder}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Auto reminder
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight={700}>{lead.daysInStage}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      days
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={lead.stageId}
                      onChange={(event) => handleStageChange(lead.id, event.target.value)}
                      sx={{ minWidth: 160, borderRadius: 2 }}
                    >
                      {stages.map((stage) => (
                        <MenuItem key={stage.id} value={stage.id}>
                          Shift to {stage.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                </TableRow>
                );
              })}
              {!filteredLeads.length ? (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <Typography align="center" color="text.secondary">
                      No leads found for this stage.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={isAddLeadOpen} onClose={handleCloseAddLead} fullWidth maxWidth="sm">
        <DialogTitle>Add New Lead</DialogTitle>
        <Box component="form" onSubmit={handleAddLeadSubmit}>
          <DialogContent sx={{ display: "grid", gap: 2 }}>
            <TextField
              label="Name"
              placeholder="Enter Name"
              required
              value={leadForm.name}
              onChange={(event) => setLeadForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <TextField
              label="Phone"
              placeholder="Enter WhatsApp Number"
              value={leadForm.phone}
              onChange={(event) => setLeadForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <TextField
              label="Email"
              placeholder="Enter Email"
              type="email"
              value={leadForm.email}
              onChange={(event) => setLeadForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <TextField
              label="Company"
              placeholder="Enter Company"
              value={leadForm.company}
              onChange={(event) => setLeadForm((prev) => ({ ...prev, company: event.target.value }))}
            />
            <TextField
              label="Created"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={leadForm.createdAt}
              onChange={(event) => setLeadForm((prev) => ({ ...prev, createdAt: event.target.value }))}
            />
            <TextField
              select
              label="Stage"
              required
              value={leadForm.stageId}
              onChange={(event) => setLeadForm((prev) => ({ ...prev, stageId: event.target.value }))}
            >
              {stages.map((stage) => (
                <MenuItem key={stage.id} value={stage.id}>
                  {stage.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Notes"
              placeholder="Take a note for this lead"
              multiline
              minRows={3}
              value={leadForm.notes}
              onChange={(event) => setLeadForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
            <TextField
              select
              label="Assign to"
              value={leadForm.assigneeId}
              onChange={(event) => setLeadForm((prev) => ({ ...prev, assigneeId: event.target.value }))}
            >
              <MenuItem value="">
                <em>Unassigned</em>
              </MenuItem>
              {assignees.map((assignee) => (
                <MenuItem key={assignee.id} value={assignee.id}>
                  {assignee.name} ({assignee.role})
                </MenuItem>
              ))}
            </TextField>
            {addLeadError ? (
              <Typography variant="body2" color="error">
                {addLeadError}
              </Typography>
            ) : null}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCloseAddLead} disabled={isSubmittingLead}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmittingLead}>
              {isSubmittingLead ? "Adding..." : "Add Lead"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
