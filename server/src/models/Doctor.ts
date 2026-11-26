import mongoose, { Document, Schema, Types } from "mongoose";

export interface IWeeklyScheduleEntry {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface IDoctor extends Document {
  nameAr: string;
  titleAr: string;
  specialty: Types.ObjectId;
  area: Types.ObjectId;
  yearsOfExperience: number;
  rating: number;
  reviewCount: number;
  consultationFee: number;
  clinicName: string;
  clinicAddress: string;
  weeklySchedule: IWeeklyScheduleEntry[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const weeklyScheduleEntrySchema = new Schema<IWeeklyScheduleEntry>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false },
);

const doctorSchema = new Schema<IDoctor>(
  {
    nameAr: { type: String, required: true, trim: true },
    titleAr: { type: String, required: true, trim: true },
    specialty: {
      type: Schema.Types.ObjectId,
      ref: "Specialty",
      required: true,
    },
    area: {
      type: Schema.Types.ObjectId,
      ref: "Area",
      required: true,
    },
    yearsOfExperience: { type: Number, required: true, min: 0 },
    rating: { type: Number, required: true, min: 0, max: 5 },
    reviewCount: { type: Number, required: true, min: 0 },
    consultationFee: { type: Number, required: true, min: 0 },
    clinicName: { type: String, required: true, trim: true },
    clinicAddress: { type: String, required: true, trim: true },
    weeklySchedule: { type: [weeklyScheduleEntrySchema], default: [] },
    isActive: { type: Boolean, default: true, required: true },
  },
  { timestamps: true },
);

export const Doctor = mongoose.model<IDoctor>("Doctor", doctorSchema);
