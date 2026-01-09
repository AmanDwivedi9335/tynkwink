import { Prisma } from "@prisma/client";
import type { Response } from "express";

const CONNECTION_ERROR_CODES = new Set(["P1001", "P1002", "P1003", "P1008", "P1012"]);

const isKnownConnectionError = (code?: string | null) =>
  Boolean(code && CONNECTION_ERROR_CODES.has(code));

export const isPrismaConnectionError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return isKnownConnectionError(error.code);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return isKnownConnectionError(error.errorCode);
  }

  if (error instanceof Error) {
    return error.message.includes("Can't reach database server");
  }

  return false;
};

export const respondToPrismaConnectionError = (res: Response, error: unknown) => {
  if (!isPrismaConnectionError(error)) return false;

  res.status(503).json({ message: "Database unavailable. Please try again shortly." });
  return true;
};
