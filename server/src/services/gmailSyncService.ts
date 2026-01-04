import { prisma } from "../prisma";
import { listMessages, getMessage } from "../providers/gmail";
import { matchesRule, GmailRuleCondition, ParsedEmail, gmailRuleSchema } from "./gmailRules";
import { safeTruncate } from "../security/encryption";
import { writeAuditLog } from "../security/audit";

const MAX_BODY_LENGTH = 4000;

function parseHeaders(headers: { name?: string; value?: string }[] | undefined) {
  const result: Record<string, string> = {};
  headers?.forEach((header) => {
    if (header.name && header.value) {
      result[header.name.toLowerCase()] = header.value;
    }
  });
  return result;
}

function extractBody(payload: any): { text: string; hasAttachments: boolean } {
  let text = "";
  let hasAttachments = false;
  const stack = [payload];
  while (stack.length) {
    const part = stack.pop();
    if (!part) continue;
    if (part.filename && part.filename.length > 0) {
      hasAttachments = true;
    }
    if (part.parts) {
      stack.push(...part.parts);
    }
    if (part.mimeType === "text/plain" && part.body?.data) {
      const decoded = Buffer.from(part.body.data, "base64").toString("utf8");
      text += `\n${decoded}`;
    }
  }
  return { text: safeTruncate(text.trim(), MAX_BODY_LENGTH), hasAttachments };
}

function buildParsedEmail(message: any): ParsedEmail {
  const headers = parseHeaders(message.payload?.headers ?? []);
  const { text, hasAttachments } = extractBody(message.payload ?? {});
  const receivedAt = message.internalDate ? new Date(Number(message.internalDate)) : new Date();
  return {
    headers,
    bodyText: text,
    labelIds: message.labelIds ?? [],
    hasAttachments,
    receivedAt,
  };
}

function buildQuery(lastSyncAt?: Date | null) {
  if (!lastSyncAt) return undefined;
  const unix = Math.floor(lastSyncAt.getTime() / 1000);
  return `after:${unix}`;
}

export async function syncGmailIntegration(integrationId: string) {
  const integration = await prisma.gmailIntegration.findUnique({
    where: { id: integrationId },
    include: { rules: true, syncState: true },
  });
  if (!integration) {
    throw new Error("Integration not found");
  }

  try {
    const scopes = integration.scopes.split(" ");
    const lastSyncAt = integration.syncState?.lastSyncAt;
    const query = buildQuery(lastSyncAt);

    let pageToken: string | undefined;
    let checkedCount = 0;
    let matchedCount = 0;
    const activeRules = integration.rules.filter((rule) => rule.isActive);

    const parsedRules = activeRules.map((rule) => ({
      id: rule.id,
      name: rule.name,
      condition: gmailRuleSchema.parse(rule.conditionsJson) as GmailRuleCondition,
    }));
    const matchedRuleCounts = new Map(
      parsedRules.map((rule) => [rule.id, { ruleId: rule.id, ruleName: rule.name, matchedCount: 0 }])
    );

    do {
      const { messages, nextPageToken } = await listMessages({
        encryptedRefreshToken: integration.encryptedRefreshToken,
        scopes,
        query,
        pageToken,
        maxResults: 50,
      });
      for (const messageSummary of messages) {
        const message = await getMessage({
          encryptedRefreshToken: integration.encryptedRefreshToken,
          scopes,
          messageId: messageSummary.id,
        });
        checkedCount += 1;
        const parsed = buildParsedEmail(message);
        const matchedRules = parsedRules.filter((rule) => matchesRule(rule.condition, parsed));
        if (matchedRules.length === 0) {
          continue;
        }
        matchedCount += 1;
        matchedRules.forEach((rule) => {
          const entry = matchedRuleCounts.get(rule.id);
          if (entry) {
            entry.matchedCount += 1;
          }
        });

        await prisma.leadInbox.upsert({
          where: { integrationId_gmailMessageId: { integrationId, gmailMessageId: message.id } },
          update: {},
          create: {
            tenantId: integration.tenantId,
            integrationId,
            gmailMessageId: message.id,
            threadId: message.threadId ?? null,
            from: parsed.headers.from ?? "",
            subject: parsed.headers.subject ?? null,
            snippet: message.snippet ?? null,
            receivedAt: parsed.receivedAt,
            rawHeadersJson: parsed.headers,
            rawBodyText: parsed.bodyText,
            status: "PENDING",
            detectedAssigneeHint: null,
          },
        });
      }
      pageToken = nextPageToken;
    } while (pageToken);

    const matchedRulesSummary = Array.from(matchedRuleCounts.values()).filter(
      (rule) => rule.matchedCount > 0
    );

    await prisma.gmailSyncState.upsert({
      where: { integrationId },
      update: {
        lastSyncAt: new Date(),
        lastCheckedCount: checkedCount,
        lastMatchedCount: matchedCount,
        lastMatchedRulesJson: matchedRulesSummary,
        errorCount: 0,
        lastError: null,
        backoffUntil: null,
      },
      create: {
        integrationId,
        lastSyncAt: new Date(),
        lastCheckedCount: checkedCount,
        lastMatchedCount: matchedCount,
        lastMatchedRulesJson: matchedRulesSummary,
        errorCount: 0,
      },
    });

    await writeAuditLog({
      tenantId: integration.tenantId,
      actorUserId: integration.createdByUserId,
      actionType: "GMAIL_SYNC",
      entityType: "GmailIntegration",
      entityId: integration.id,
      meta: { checkedCount, matchedCount, matchedRules: matchedRulesSummary },
    });

    return { checkedCount, matchedCount };
  } catch (error: any) {
    const nextErrorCount = (integration.syncState?.errorCount ?? 0) + 1;
    const backoffMinutes = Math.min(60, Math.pow(2, nextErrorCount));
    await prisma.gmailSyncState.upsert({
      where: { integrationId },
      update: {
        errorCount: nextErrorCount,
        lastError: safeTruncate(error.message ?? "Unknown error", 500),
        backoffUntil: new Date(Date.now() + backoffMinutes * 60 * 1000),
      },
      create: {
        integrationId,
        errorCount: nextErrorCount,
        lastError: safeTruncate(error.message ?? "Unknown error", 500),
        backoffUntil: new Date(Date.now() + backoffMinutes * 60 * 1000),
      },
    });
    throw error;
  }
}
