import { Request, Response, NextFunction } from "express";
import { ar } from "../content/ar.js";

interface AppError extends Error {
  statusCode?: number;
  code?: string;
  fields?: Record<string, string>;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";
  const message = err.message || ar.unexpectedError;

  const body: {
    error: { code: string; message: string; fields?: Record<string, string> };
  } = {
    error: { code, message },
  };

  if (err.fields) {
    body.error.fields = err.fields;
  }

  res.status(statusCode).json(body);
}
