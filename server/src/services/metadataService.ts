import { Specialty } from "../models/Specialty.js";
import { Area } from "../models/Area.js";

export interface MetadataItemDto {
  id: string;
  nameAr: string;
}

export interface MetadataResponseDto {
  specialties: MetadataItemDto[];
  areas: MetadataItemDto[];
}

export async function getMetadata(): Promise<MetadataResponseDto> {
  const [specialties, areas] = await Promise.all([
    Specialty.find().select("nameAr").sort({ _id: 1 }).lean(),
    Area.find().select("nameAr").sort({ _id: 1 }).lean(),
  ]);

  return {
    specialties: specialties.map((item) => ({
      id: String(item._id),
      nameAr: item.nameAr,
    })),
    areas: areas.map((item) => ({
      id: String(item._id),
      nameAr: item.nameAr,
    })),
  };
}
