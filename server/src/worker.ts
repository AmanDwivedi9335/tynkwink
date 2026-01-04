import "dotenv/config";
import { Worker } from "bullmq";
import { gmailSyncQueue, leadImportQueue, digestQueue } from "./queues/queues";
import { syncGmailIntegration } from "./services/gmailSyncService";
import { importLeadFromInbox } from "./services/leadImportService";
import { sendApprovalDigests } from "./services/digestService";

const connection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD || undefined,
};

export const startWorkers = () => {
  new Worker(
    "gmail-sync",
    async (job) => {
      return await syncGmailIntegration(job.data.integrationId);
    },
    { connection, concurrency: Number(process.env.GMAIL_SYNC_CONCURRENCY ?? 2) }
  );

  new Worker(
    "lead-import",
    async (job) => {
      const correlationId = job.id?.toString() ?? "lead-import";
      return await importLeadFromInbox(job.data.leadInboxId, correlationId);
    },
    { connection, concurrency: Number(process.env.LEAD_IMPORT_CONCURRENCY ?? 2) }
  );

  new Worker(
    "lead-digest",
    async () => {
      return await sendApprovalDigests();
    },
    { connection, concurrency: 1 }
  );

  void digestQueue.add(
    "lead-digest",
    {},
    {
      repeat: { every: 5 * 60 * 1000 },
      jobId: "lead-digest-cron",
    }
  );
};

if (require.main === module) {
  startWorkers();
}
