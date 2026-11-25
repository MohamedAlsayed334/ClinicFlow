import { Router } from "express";
import { ar } from "../content/ar.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", message: ar.serverHealthy });
});
