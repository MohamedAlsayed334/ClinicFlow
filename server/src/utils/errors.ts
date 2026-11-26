import { ar } from "../content/ar.js";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly fields?: Record<string, string>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }
}

export function createValidationError(
  fields: Record<string, string>,
): AppError {
  return new AppError(400, "VALIDATION_ERROR", ar.validationError, fields);
}

export function createNotFoundError(message: string = ar.notFound): AppError {
  return new AppError(404, "NOT_FOUND", message);
}
