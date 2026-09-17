export const CRM_PIPELINE_STAGES = [
  { id: "not_contacted", label: "Not Contacted" },
  { id: "email_sent", label: "Email Sent" },
  { id: "follow_up", label: "Follow-up" },
  { id: "meeting_scheduled", label: "Meeting Scheduled" },
  { id: "proposal_sent", label: "Proposal Sent" },
  { id: "negotiation", label: "Negotiation" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
] as const;

export type CrmPipelineStage = (typeof CRM_PIPELINE_STAGES)[number]["id"];
