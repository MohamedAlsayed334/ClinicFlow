import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
import { metadataRouter } from "./routes/metadata.js";
import { doctorsRouter } from "./routes/doctors.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.use("/api", healthRouter);
app.use("/api", metadataRouter);
app.use("/api", doctorsRouter);

app.use(errorHandler);
