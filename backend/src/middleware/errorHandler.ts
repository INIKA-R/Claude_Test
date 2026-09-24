import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

// Central error handler — every route delegates error shaping here via asyncHandler.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal Server Error";
  res.status(500).json({ error: message });
}
