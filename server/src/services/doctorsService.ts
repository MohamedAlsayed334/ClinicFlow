import { DateTime } from "luxon";
import { Types } from "mongoose";
import { ar } from "../content/ar.js";
import { Appointment } from "../models/Appointment.js";
import { Doctor, IWeeklyScheduleEntry } from "../models/Doctor.js";
import { createNotFoundError } from "../utils/errors.js";
import {
  GeneratedDaySlots,
  generateDoctorSlots,
  getNextAvailableSlot,
} from "./slotGenerator.js";

const CAIRO_ZONE = "Africa/Cairo";
const HORIZON_DAYS = 7;

export type DoctorSort = "earliest" | "rating" | "fee";

export interface ListDoctorsParams {
  specialtyId?: string;
  areaId?: string;
  minRating?: number;
  maxFee?: number;
  sort: DoctorSort;
  page: number;
  pageSize: number;
}

export interface DoctorListItemDto {
  id: string;
  nameAr: string;
  titleAr: string;
  specialty: { id: string; nameAr: string };
  area: { id: string; nameAr: string };
  yearsOfExperience: number;
  rating: number;
  reviewCount: number;
  consultationFee: number;
  clinicName: string;
  clinicAddress: string;
  workingHoursLabel: string;
  nextAvailableSlot: string | null;
}

export interface DoctorDetailDto extends DoctorListItemDto {
  weeklySchedule: IWeeklyScheduleEntry[];
}

export interface ListDoctorsResponseDto {
  items: DoctorListItemDto[];
  total: number;
  page: number;
  pageSize: number;
}

interface PopulatedRef {
  _id: Types.ObjectId;
  nameAr: string;
}

interface PopulatedDoctorLean {
  _id: Types.ObjectId;
  nameAr: string;
  titleAr: string;
  specialty: PopulatedRef;
  area: PopulatedRef;
  yearsOfExperience: number;
  rating: number;
  reviewCount: number;
  consultationFee: number;
  clinicName: string;
  clinicAddress: string;
  weeklySchedule: IWeeklyScheduleEntry[];
}

function buildWorkingHoursLabel(
  weeklySchedule: ReadonlyArray<IWeeklyScheduleEntry>,
): string {
  if (weeklySchedule.length === 0) {
    return "";
  }
  const starts = weeklySchedule.map((entry) => entry.startTime).sort();
  const ends = weeklySchedule.map((entry) => entry.endTime).sort();
  return `${starts[0]} - ${ends[ends.length - 1]}`;
}

function getHorizonBounds(now: Date): { start: Date; end: Date } {
  const nowCairo = DateTime.fromJSDate(now, { zone: CAIRO_ZONE });
  const end = nowCairo.startOf("day").plus({ days: HORIZON_DAYS }).toJSDate();
  return { start: now, end };
}

function mapDoctorToDto(
  doc: PopulatedDoctorLean,
  nextAvailableSlot: string | null,
): DoctorListItemDto {
  return {
    id: String(doc._id),
    nameAr: doc.nameAr,
    titleAr: doc.titleAr,
    specialty: {
      id: String(doc.specialty._id),
      nameAr: doc.specialty.nameAr,
    },
    area: {
      id: String(doc.area._id),
      nameAr: doc.area.nameAr,
    },
    yearsOfExperience: doc.yearsOfExperience,
    rating: doc.rating,
    reviewCount: doc.reviewCount,
    consultationFee: doc.consultationFee,
    clinicName: doc.clinicName,
    clinicAddress: doc.clinicAddress,
    workingHoursLabel: buildWorkingHoursLabel(doc.weeklySchedule),
    nextAvailableSlot,
  };
}

function compareDoctors(
  a: DoctorListItemDto,
  b: DoctorListItemDto,
  sort: DoctorSort,
): number {
  if (sort === "rating") {
    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    }
    return b.reviewCount - a.reviewCount;
  }

  if (sort === "fee") {
    if (a.consultationFee !== b.consultationFee) {
      return a.consultationFee - b.consultationFee;
    }
    return b.rating - a.rating;
  }

  if (a.nextAvailableSlot && b.nextAvailableSlot) {
    if (a.nextAvailableSlot < b.nextAvailableSlot) {
      return -1;
    }
    if (a.nextAvailableSlot > b.nextAvailableSlot) {
      return 1;
    }
    return b.rating - a.rating;
  }
  if (a.nextAvailableSlot && !b.nextAvailableSlot) {
    return -1;
  }
  if (!a.nextAvailableSlot && b.nextAvailableSlot) {
    return 1;
  }
  return b.rating - a.rating;
}

export async function listDoctors(
  params: ListDoctorsParams,
  now: Date = new Date(),
): Promise<ListDoctorsResponseDto> {
  const filter: Record<string, unknown> = { isActive: true };

  if (params.specialtyId) {
    filter.specialty = new Types.ObjectId(params.specialtyId);
  }
  if (params.areaId) {
    filter.area = new Types.ObjectId(params.areaId);
  }
  if (params.minRating !== undefined) {
    filter.rating = { $gte: params.minRating };
  }
  if (params.maxFee !== undefined) {
    filter.consultationFee = { $lte: params.maxFee };
  }

  const doctors = await Doctor.find(filter)
    .populate<{ specialty: PopulatedRef }>("specialty", "nameAr")
    .populate<{ area: PopulatedRef }>("area", "nameAr")
    .lean<PopulatedDoctorLean[]>();

  if (doctors.length === 0) {
    return {
      items: [],
      total: 0,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  const doctorIds = doctors.map((doc) => doc._id);
  const { start, end } = getHorizonBounds(now);

  const appointments = await Appointment.find({
    doctor: { $in: doctorIds },
    status: "confirmed",
    startsAt: { $gte: start, $lt: end },
  })
    .select("doctor startsAt")
    .lean();

  const takenByDoctor = new Map<string, Date[]>();
  for (const appt of appointments) {
    const key = String(appt.doctor);
    const list = takenByDoctor.get(key);
    if (list) {
      list.push(appt.startsAt);
    } else {
      takenByDoctor.set(key, [appt.startsAt]);
    }
  }

  const mapped = doctors.map((doc) => {
    const taken = takenByDoctor.get(String(doc._id)) ?? [];
    const days = generateDoctorSlots(doc.weeklySchedule, taken, now);
    const nextSlot = getNextAvailableSlot(days);
    return mapDoctorToDto(doc, nextSlot);
  });

  mapped.sort((a, b) => compareDoctors(a, b, params.sort));

  const total = mapped.length;
  const startIndex = (params.page - 1) * params.pageSize;
  const items = mapped.slice(startIndex, startIndex + params.pageSize);

  return {
    items,
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function getDoctorById(
  id: string,
  now: Date = new Date(),
): Promise<DoctorDetailDto> {
  if (!Types.ObjectId.isValid(id)) {
    throw createNotFoundError(ar.doctorNotFound);
  }

  const doctor = await Doctor.findOne({ _id: id, isActive: true })
    .populate<{ specialty: PopulatedRef }>("specialty", "nameAr")
    .populate<{ area: PopulatedRef }>("area", "nameAr")
    .lean<PopulatedDoctorLean | null>();

  if (!doctor) {
    throw createNotFoundError(ar.doctorNotFound);
  }

  const { start, end } = getHorizonBounds(now);
  const appointments = await Appointment.find({
    doctor: doctor._id,
    status: "confirmed",
    startsAt: { $gte: start, $lt: end },
  })
    .select("startsAt")
    .lean();

  const taken = appointments.map((appt) => appt.startsAt);
  const days = generateDoctorSlots(doctor.weeklySchedule, taken, now);
  const nextSlot = getNextAvailableSlot(days);

  return {
    ...mapDoctorToDto(doctor, nextSlot),
    weeklySchedule: doctor.weeklySchedule.map((entry) => ({
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
    })),
  };
}

export async function getDoctorSlots(
  id: string,
  now: Date = new Date(),
): Promise<{ days: GeneratedDaySlots[] }> {
  if (!Types.ObjectId.isValid(id)) {
    throw createNotFoundError(ar.doctorNotFound);
  }

  const doctor = await Doctor.findOne({ _id: id, isActive: true })
    .select("weeklySchedule")
    .lean();

  if (!doctor) {
    throw createNotFoundError(ar.doctorNotFound);
  }

  const { start, end } = getHorizonBounds(now);
  const appointments = await Appointment.find({
    doctor: doctor._id,
    status: "confirmed",
    startsAt: { $gte: start, $lt: end },
  })
    .select("startsAt")
    .lean();

  const taken = appointments.map((appt) => appt.startsAt);
  const days = generateDoctorSlots(doctor.weeklySchedule, taken, now);

  return { days };
}
