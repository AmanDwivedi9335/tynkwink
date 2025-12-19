import { Router } from "express";
import { requireAuth } from "../middleware/auth";

const router = Router();

const pipelineData = {
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

router.get("/crm/pipeline", requireAuth, (_req, res) => {
  res.json(pipelineData);
});

export default router;
