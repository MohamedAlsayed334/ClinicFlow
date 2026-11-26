import mongoose, { Document, Schema } from "mongoose";

export interface IArea extends Document {
  nameAr: string;
  createdAt: Date;
  updatedAt: Date;
}

const areaSchema = new Schema<IArea>(
  {
    nameAr: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true },
);

export const Area = mongoose.model<IArea>("Area", areaSchema);
