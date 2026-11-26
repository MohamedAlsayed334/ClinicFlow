import mongoose, { Document, Schema } from "mongoose";

export interface ISpecialty extends Document {
  nameAr: string;
  createdAt: Date;
  updatedAt: Date;
}

const specialtySchema = new Schema<ISpecialty>(
  {
    nameAr: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true },
);

export const Specialty = mongoose.model<ISpecialty>(
  "Specialty",
  specialtySchema,
);
