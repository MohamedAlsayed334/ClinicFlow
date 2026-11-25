import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const env = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  MONGODB_URI:
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/clinicflow",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
  NODE_ENV: process.env.NODE_ENV || "development",
};
