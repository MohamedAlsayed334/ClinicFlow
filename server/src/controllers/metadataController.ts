import { NextFunction, Request, Response } from "express";
import { getMetadata } from "../services/metadataService.js";

export async function getMetadataHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const metadata = await getMetadata();
    res.json(metadata);
  } catch (err) {
    next(err);
  }
}
