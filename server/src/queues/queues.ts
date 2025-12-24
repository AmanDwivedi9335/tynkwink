import { Queue } from "bullmq";

const connection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD || undefined,
};

export const gmailSyncQueue = new Queue("gmail-sync", { connection });
export const leadImportQueue = new Queue("lead-import", { connection });
export const digestQueue = new Queue("lead-digest", { connection });
