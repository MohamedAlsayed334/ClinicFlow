import { Router } from "express";
import { getMetadataHandler } from "../controllers/metadataController.js";

export const metadataRouter = Router();

metadataRouter.get("/metadata", getMetadataHandler);
