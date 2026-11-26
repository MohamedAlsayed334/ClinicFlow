import { NextFunction, Request, Response } from "express";
import { ar } from "../content/ar.js";
import {
  DoctorSort,
  getDoctorById,
  getDoctorSlots,
  listDoctors,
  ListDoctorsParams,
} from "../services/doctorsService.js";
import { createValidationError } from "../utils/errors.js";
import { isValidObjectId } from "../utils/validation.js";

const VALID_SORTS: readonly DoctorSort[] = ["earliest", "rating", "fee"];

function parseSingleQueryString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

function parseListDoctorsQuery(query: Request["query"]): ListDoctorsParams {
  const fields: Record<string, string> = {};

  const specialtyId = parseSingleQueryString(query.specialtyId);
  if (query.specialtyId !== undefined && !specialtyId) {
    fields.specialtyId = ar.invalidSpecialtyId;
  } else if (specialtyId && !isValidObjectId(specialtyId)) {
    fields.specialtyId = ar.invalidSpecialtyId;
  }

  const areaId = parseSingleQueryString(query.areaId);
  if (query.areaId !== undefined && !areaId) {
    fields.areaId = ar.invalidAreaId;
  } else if (areaId && !isValidObjectId(areaId)) {
    fields.areaId = ar.invalidAreaId;
  }

  let minRating: number | undefined;
  if (query.minRating !== undefined) {
    const raw = parseSingleQueryString(query.minRating);
    const parsed = raw !== undefined ? Number(raw) : NaN;
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5) {
      fields.minRating = ar.invalidMinRating;
    } else {
      minRating = parsed;
    }
  }

  let maxFee: number | undefined;
  if (query.maxFee !== undefined) {
    const raw = parseSingleQueryString(query.maxFee);
    const parsed = raw !== undefined ? Number(raw) : NaN;
    if (!Number.isFinite(parsed) || parsed < 0) {
      fields.maxFee = ar.invalidMaxFee;
    } else {
      maxFee = parsed;
    }
  }

  let sort: DoctorSort = "earliest";
  if (query.sort !== undefined) {
    const raw = parseSingleQueryString(query.sort);
    if (!raw || !VALID_SORTS.includes(raw as DoctorSort)) {
      fields.sort = ar.invalidSort;
    } else {
      sort = raw as DoctorSort;
    }
  }

  let page = 1;
  if (query.page !== undefined) {
    const raw = parseSingleQueryString(query.page);
    const parsed = raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : NaN;
    if (!Number.isInteger(parsed) || parsed < 1) {
      fields.page = ar.invalidPage;
    } else {
      page = parsed;
    }
  }

  let pageSize = 10;
  if (query.pageSize !== undefined) {
    const raw = parseSingleQueryString(query.pageSize);
    const parsed = raw !== undefined && /^\d+$/.test(raw) ? Number(raw) : NaN;
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
      fields.pageSize = ar.invalidPageSize;
    } else {
      pageSize = parsed;
    }
  }

  if (Object.keys(fields).length > 0) {
    throw createValidationError(fields);
  }

  return {
    specialtyId,
    areaId,
    minRating,
    maxFee,
    sort,
    page,
    pageSize,
  };
}

export async function listDoctorsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = parseListDoctorsQuery(req.query);
    const result = await listDoctors(params);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getDoctorByIdHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const doctor = await getDoctorById(req.params.id);
    res.json(doctor);
  } catch (err) {
    next(err);
  }
}

export async function getDoctorSlotsHandler(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await getDoctorSlots(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
