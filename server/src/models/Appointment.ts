import mongoose, { Document, Schema, Types } from "mongoose";

export type AppointmentStatus = "confirmed" | "cancelled";
export type CancelledBy = "patient" | "guest" | "admin";

export interface IAppointment extends Document {
  code: string;
  doctor: Types.ObjectId;
  user?: Types.ObjectId;
  patientName: string;
  patientPhone: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  cancelledAt?: Date;
  cancelledBy?: CancelledBy;
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    patientName: { type: String, required: true, trim: true },
    patientPhone: { type: String, required: true, trim: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
      required: true,
    },
    cancelledAt: { type: Date, required: false },
    cancelledBy: {
      type: String,
      enum: ["patient", "guest", "admin"],
      required: false,
    },
  },
  { timestamps: true },
);

appointmentSchema.index(
  { doctor: 1, startsAt: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "confirmed" },
  },
);
appointmentSchema.index({ user: 1, startsAt: -1 });
appointmentSchema.index({ patientPhone: 1 });

export const Appointment = mongoose.model<IAppointment>(
  "Appointment",
  appointmentSchema,
);
