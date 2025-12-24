import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

export function attachCorrelationId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.headers["x-correlation-id"];
  const correlationId = Array.isArray(incoming) ? incoming[0] : incoming;
  const resolved = correlationId || crypto.randomUUID();
  req.headers["x-correlation-id"] = resolved;
  res.setHeader("x-correlation-id", resolved);
  next();
}
