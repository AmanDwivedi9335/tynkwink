import { PrismaClient } from "@prisma/client";
import { createRequire } from "module";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const require = createRequire(import.meta.url);

const createClient = (ClientCtor: typeof PrismaClient) =>
  new ClientCtor({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

const hasGmailModels = (client: PrismaClient) =>
  "gmailIntegration" in client && "gmailRule" in client;

const loadFreshClient = () => {
  delete require.cache[require.resolve("@prisma/client")];
  const { PrismaClient: FreshClient } = require("@prisma/client") as { PrismaClient: typeof PrismaClient };
  return createClient(FreshClient);
};

let prismaInstance = global.__prisma ?? createClient(PrismaClient);

const ensureGmailModels = () => {
  if (!hasGmailModels(prismaInstance)) {
    prismaInstance = loadFreshClient();
  }

  if (process.env.NODE_ENV !== "production") {
    global.__prisma = prismaInstance;
  }

  return prismaInstance;
};

prismaInstance = ensureGmailModels();

export const prisma = prismaInstance;
export const getPrismaClient = () => ensureGmailModels();

if (process.env.NODE_ENV !== "production") global.__prisma = prisma;
