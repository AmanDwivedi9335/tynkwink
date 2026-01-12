import BoltIcon from "@mui/icons-material/Bolt";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import EmailIcon from "@mui/icons-material/Email";
import ScheduleIcon from "@mui/icons-material/Schedule";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";

export type SmartTriggerStep = {
  id: string;
  label: string;
  title: string;
  detail: string;
  type: "TRIGGER" | "ACTION" | "ACTION_EMAIL" | "DELAY" | "DECISION";
  tags: string[];
};

export type SmartTriggerFlowSummary = {
  id: string;
  name: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  updatedAt: string;
};

export type SmartTriggerFlow = SmartTriggerFlowSummary & {
  description?: string | null;
  steps: SmartTriggerStep[];
};

export const stepTemplates: SmartTriggerStep[] = [
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
    detail: "Template: Welcome series intro",
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
    id: "step-action-email",
    label: "Action",
    title: "Send email message",
    detail: "Template: Product brochure",
    type: "ACTION_EMAIL",
    tags: ["Email", "Template"],
  },
  {
    id: "step-delay-followup",
    label: "Delay",
    title: "Wait 1 day",
    detail: "Delay before the next reminder",
    type: "DELAY",
    tags: ["Delay", "Follow-up"],
  },
  {
    id: "step-action-whatsapp-followup",
    label: "Action",
    title: "Send WhatsApp reminder",
    detail: "Template: Follow-up reminder",
    type: "ACTION",
    tags: ["WhatsApp", "Follow-up"],
  },
];

export const stepIconMap: Record<SmartTriggerStep["type"], JSX.Element> = {
  TRIGGER: <BoltIcon fontSize="small" />,
  ACTION: <WhatsAppIcon fontSize="small" />,
  ACTION_EMAIL: <EmailIcon fontSize="small" />,
  DELAY: <ScheduleIcon fontSize="small" />,
  DECISION: <CallSplitIcon fontSize="small" />,
};

export const createDefaultSteps = () =>
  stepTemplates.map((step) => ({
    ...step,
    id: `${step.id}-${crypto.randomUUID()}`,
  }));

export const getRunStateLabel = (status: SmartTriggerFlowSummary["status"]) => {
  if (status === "PUBLISHED") {
    return "Running";
  }
  if (status === "ARCHIVED") {
    return "Archived";
  }
  return "Paused";
};

export const getRunStateTone = (status: SmartTriggerFlowSummary["status"]) => {
  if (status === "PUBLISHED") {
    return "success" as const;
  }
  if (status === "ARCHIVED") {
    return "default" as const;
  }
  return "warning" as const;
};

const hashString = (value: string) =>
  value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);

export const getProcessedLeads = (flowId: string) => {
  const base = hashString(flowId);
  return 120 + (base % 480);
};
