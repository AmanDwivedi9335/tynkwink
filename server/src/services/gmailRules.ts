import { z } from "zod";

export const gmailRuleSchema = z.object({
  from: z.string().trim().optional(),
  subjectContains: z.string().trim().optional(),
  to: z.string().trim().optional(),
  cc: z.string().trim().optional(),
  hasAttachments: z.boolean().optional(),
  keywords: z.array(z.string().trim()).optional(),
  label: z.string().trim().optional(),
  unreadOnly: z.boolean().optional(),
  dateWindow: z
    .object({
      start: z.string().datetime().optional(),
      end: z.string().datetime().optional(),
    })
    .optional(),
});

export type GmailRuleCondition = z.infer<typeof gmailRuleSchema>;

export type ParsedEmail = {
  headers: Record<string, string>;
  bodyText: string;
  labelIds: string[];
  hasAttachments: boolean;
  receivedAt: Date;
};

export function matchesRule(condition: GmailRuleCondition, email: ParsedEmail): boolean {
  if (condition.from && !email.headers.from?.toLowerCase().includes(condition.from.toLowerCase())) {
    return false;
  }
  if (condition.subjectContains && !email.headers.subject?.toLowerCase().includes(condition.subjectContains.toLowerCase())) {
    return false;
  }
  if (condition.to && !email.headers.to?.toLowerCase().includes(condition.to.toLowerCase())) {
    return false;
  }
  if (condition.cc && !email.headers.cc?.toLowerCase().includes(condition.cc.toLowerCase())) {
    return false;
  }
  if (condition.hasAttachments !== undefined && condition.hasAttachments !== email.hasAttachments) {
    return false;
  }
  if (condition.label) {
    const labelMatch = email.labelIds.some((label) => label.toLowerCase() === condition.label!.toLowerCase());
    if (!labelMatch) return false;
  }
  if (condition.unreadOnly && !email.labelIds.includes("UNREAD")) {
    return false;
  }
  if (condition.keywords && condition.keywords.length > 0) {
    const haystack = `${email.headers.subject ?? ""} ${email.bodyText}`.toLowerCase();
    if (!condition.keywords.every((keyword) => haystack.includes(keyword.toLowerCase()))) {
      return false;
    }
  }
  if (condition.dateWindow?.start) {
    const start = new Date(condition.dateWindow.start);
    if (email.receivedAt < start) return false;
  }
  if (condition.dateWindow?.end) {
    const end = new Date(condition.dateWindow.end);
    if (email.receivedAt > end) return false;
  }
  return true;
}
