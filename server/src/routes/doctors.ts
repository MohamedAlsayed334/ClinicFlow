import { Router } from "express";
import {
  getDoctorByIdHandler,
  getDoctorSlotsHandler,
  listDoctorsHandler,
} from "../controllers/doctorsController.js";

export const doctorsRouter = Router();

doctorsRouter.get("/doctors", listDoctorsHandler);
doctorsRouter.get("/doctors/:id", getDoctorByIdHandler);
doctorsRouter.get("/doctors/:id/slots", getDoctorSlotsHandler);
