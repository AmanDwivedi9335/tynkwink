import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Paper,
  Stack,
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
import { useState } from "react";

const triggerCards = [
  {
    title: "New lead captured",
    description: "Start welcome sequence the moment a lead is created.",
    chips: ["Instant", "Inbound"],
  },
  {
    title: "Lead status changes",
    description: "Fire automation when stage updates to Qualified or Won.",
    chips: ["Status change", "CRM"],
  },
  {
    title: "No response in 48 hours",
    description: "Escalate with WhatsApp + call follow-up.",
    chips: ["Delay", "Reminder"],
  },
];

const sequenceTemplates = [
  { value: "welcome", label: "New lead welcome flow" },
  { value: "status", label: "Status change nurture" },
  { value: "revival", label: "Dormant lead revival" },
  { value: "handoff", label: "Sales handoff loop" },
];

const flowSteps = [
  {
    label: "Trigger",
    title: "New lead created",
    detail: "Source: Web form, WhatsApp, or import",
    icon: <BoltIcon fontSize="small" />,
  },
  {
    label: "Action",
    title: "Send WhatsApp message",
    detail: "Template: Welcome + intro",
    icon: <WhatsAppIcon fontSize="small" />,
  },
  {
    label: "Delay",
    title: "Wait 2 hours",
    detail: "Only between 9 AM - 6 PM",
    icon: <ScheduleIcon fontSize="small" />,
  },
  {
    label: "Decision",
    title: "Status changed?",
    detail: "Qualified → send brochure",
    icon: <CallSplitIcon fontSize="small" />,
  },
];

export default function SmartTriggersPage() {
  const [template, setTemplate] = useState("welcome");

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
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" sx={{ borderRadius: 2 }}>
            Library
          </Button>
          <Button variant="contained" sx={{ borderRadius: 2, fontWeight: 700 }} startIcon={<AddIcon />}>
            Create trigger
          </Button>
        </Stack>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1.1fr 1.6fr" },
          gap: 3,
        }}
      >
        <Stack spacing={2}>
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
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={700}>
                Trigger library
              </Typography>
              <Button size="small" startIcon={<AddIcon />}>
                New trigger
              </Button>
            </Stack>
            <Stack spacing={1.5}>
              {triggerCards.map((card) => (
                <Paper
                  key={card.title}
                  elevation={0}
                  draggable
                  sx={{
                    borderRadius: 2,
                    border: "1px dashed",
                    borderColor: "divider",
                    p: 2,
                    display: "grid",
                    gap: 1,
                    cursor: "grab",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: "primary.main",
                      boxShadow: "0 12px 24px rgba(93, 74, 184, 0.12)",
                    },
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Avatar sx={{ bgcolor: "primary.light", color: "primary.main" }}>
                      <BoltIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={700}>{card.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {card.description}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        {card.chips.map((chip) => (
                          <Chip key={chip} label={chip} size="small" />
                        ))}
                      </Stack>
                    </Box>
                    <IconButton size="small">
                      <DragIndicatorIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Paper>
              ))}
            </Stack>
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
              sx={{ display: "grid", gap: 1 }}
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
        </Stack>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
            p: 3,
            display: "grid",
            gap: 2,
            minHeight: 520,
            position: "relative",
            backgroundImage:
              "radial-gradient(rgba(93, 74, 184, 0.12) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Automation canvas
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Drag triggers and actions onto the board to build your lead sequence.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined">Preview</Button>
              <Button variant="contained">Publish flow</Button>
            </Stack>
          </Stack>

          <Stack spacing={2}>
            {flowSteps.map((step, index) => (
              <Box key={step.title} sx={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 2 }}>
                <Stack spacing={1} alignItems="center">
                  <CircleIcon fontSize="small" color={index === 0 ? "primary" : "disabled"} />
                  {index < flowSteps.length - 1 ? (
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
                      {step.icon}
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
                    <IconButton size="small">
                      <DragIndicatorIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Divider />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label="WhatsApp" size="small" color="success" />
                    <Chip label="Email fallback" size="small" variant="outlined" />
                    <Chip label="Assign owner" size="small" variant="outlined" />
                  </Stack>
                </Paper>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
