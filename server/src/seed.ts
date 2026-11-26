import crypto from "crypto";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { DateTime } from "luxon";
import { env } from "./config/env.js";
import { connectDb } from "./config/db.js";
import { User } from "./models/User.js";
import { Specialty } from "./models/Specialty.js";
import { Area } from "./models/Area.js";
import { Doctor, IWeeklyScheduleEntry } from "./models/Doctor.js";
import { Appointment } from "./models/Appointment.js";
import { generateDoctorSlots } from "./services/slotGenerator.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateBookingCode(): string {
  const bytes = crypto.randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i += 1) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

const STANDARD_SCHEDULE: IWeeklyScheduleEntry[] = [
  { dayOfWeek: 0, startTime: "10:00", endTime: "18:00" },
  { dayOfWeek: 1, startTime: "10:00", endTime: "18:00" },
  { dayOfWeek: 2, startTime: "10:00", endTime: "18:00" },
  { dayOfWeek: 3, startTime: "10:00", endTime: "18:00" },
  { dayOfWeek: 4, startTime: "10:00", endTime: "18:00" },
];

const SHORT_WITH_SATURDAY_SCHEDULE: IWeeklyScheduleEntry[] = [
  { dayOfWeek: 0, startTime: "12:00", endTime: "16:00" },
  { dayOfWeek: 2, startTime: "12:00", endTime: "16:00" },
  { dayOfWeek: 6, startTime: "11:00", endTime: "15:00" },
];

const EVENING_SCHEDULE: IWeeklyScheduleEntry[] = [
  { dayOfWeek: 0, startTime: "16:00", endTime: "21:00" },
  { dayOfWeek: 1, startTime: "16:00", endTime: "21:00" },
  { dayOfWeek: 3, startTime: "16:00", endTime: "21:00" },
  { dayOfWeek: 4, startTime: "16:00", endTime: "21:00" },
  { dayOfWeek: 6, startTime: "14:00", endTime: "19:00" },
];

function buildScheduleExcludingToday(): IWeeklyScheduleEntry[] {
  const todayWeekday = DateTime.now().setZone("Africa/Cairo").weekday % 7;
  return [0, 1, 2, 3, 4, 6]
    .filter((day) => day !== todayWeekday)
    .map((dayOfWeek) => ({
      dayOfWeek,
      startTime: "10:00",
      endTime: "16:00",
    }));
}

interface SeedDoctorInput {
  nameAr: string;
  titleAr: string;
  specialtyName: string;
  areaName: string;
  yearsOfExperience: number;
  rating: number;
  reviewCount: number;
  consultationFee: number;
  clinicName: string;
  clinicAddress: string;
  weeklySchedule: IWeeklyScheduleEntry[];
}

export async function runSeed(): Promise<void> {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment",
    );
  }

  await connectDb();

  await Appointment.deleteMany({});
  await Doctor.deleteMany({});
  await Specialty.deleteMany({});
  await Area.deleteMany({});

  const normalizedAdminEmail = env.ADMIN_EMAIL.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
  await User.findOneAndUpdate(
    { email: normalizedAdminEmail },
    {
      name: "مدير النظام",
      email: normalizedAdminEmail,
      passwordHash,
      role: "admin",
    },
    { upsert: true, new: true },
  );

  const specialtyNames = ["عيون", "باطنة", "جلدية", "أطفال", "أسنان"];
  const specialtyDocs = await Specialty.insertMany(
    specialtyNames.map((nameAr) => ({ nameAr })),
  );
  const specialtyMap = new Map(
    specialtyDocs.map((doc) => [doc.nameAr, doc._id]),
  );

  const areaNames = [
    "مدينة نصر",
    "مصر الجديدة",
    "التجمع الخامس",
    "المعادي",
    "الدقي",
    "الجيزة",
  ];
  const areaDocs = await Area.insertMany(
    areaNames.map((nameAr) => ({ nameAr })),
  );
  const areaMap = new Map(areaDocs.map((doc) => [doc.nameAr, doc._id]));

  const scheduleWithoutToday = buildScheduleExcludingToday();

  const doctorsData: SeedDoctorInput[] = [
    {
      nameAr: "د. مريم أحمد",
      titleAr: "طبيبة أطفال",
      specialtyName: "أطفال",
      areaName: "مدينة نصر",
      yearsOfExperience: 8,
      rating: 4.9,
      reviewCount: 120,
      consultationFee: 300,
      clinicName: "عيادة الشفاء",
      clinicAddress: "شارع مكرم عبيد، مدينة نصر",
      weeklySchedule: STANDARD_SCHEDULE,
    },
    {
      nameAr: "د. ياسر علي",
      titleAr: "استشاري أطفال",
      specialtyName: "أطفال",
      areaName: "مدينة نصر",
      yearsOfExperience: 12,
      rating: 4.8,
      reviewCount: 95,
      consultationFee: 300,
      clinicName: "مركز النيل الطبي",
      clinicAddress: "شارع عباس العقاد، مدينة نصر",
      weeklySchedule: STANDARD_SCHEDULE,
    },
    {
      nameAr: "د. سلمى عادل",
      titleAr: "طبيبة أطفال",
      specialtyName: "أطفال",
      areaName: "مدينة نصر",
      yearsOfExperience: 5,
      rating: 4.7,
      reviewCount: 62,
      consultationFee: 300,
      clinicName: "عيادة الرحمة",
      clinicAddress: "شارع مصطفى النحاس، مدينة نصر",
      weeklySchedule: SHORT_WITH_SATURDAY_SCHEDULE,
    },
    {
      nameAr: "د. أحمد سامي",
      titleAr: "أخصائي أسنان",
      specialtyName: "أسنان",
      areaName: "مدينة نصر",
      yearsOfExperience: 6,
      rating: 4.8,
      reviewCount: 84,
      consultationFee: 250,
      clinicName: "عيادة الابتسامة",
      clinicAddress: "شارع الطيران، مدينة نصر",
      weeklySchedule: STANDARD_SCHEDULE,
    },
    {
      nameAr: "د. نور خالد",
      titleAr: "أخصائية جلدية",
      specialtyName: "جلدية",
      areaName: "مصر الجديدة",
      yearsOfExperience: 9,
      rating: 4.9,
      reviewCount: 110,
      consultationFee: 400,
      clinicName: "عيادة نضارة",
      clinicAddress: "شارع الميرغني، مصر الجديدة",
      weeklySchedule: STANDARD_SCHEDULE,
    },
    {
      nameAr: "د. كريم محمود",
      titleAr: "أخصائي أطفال",
      specialtyName: "أطفال",
      areaName: "مدينة نصر",
      yearsOfExperience: 7,
      rating: 4.6,
      reviewCount: 54,
      consultationFee: 250,
      clinicName: "عيادة الأمل",
      clinicAddress: "شارع حسن المأمون، مدينة نصر",
      weeklySchedule: STANDARD_SCHEDULE,
    },
    {
      nameAr: "د. هبة مصطفى",
      titleAr: "استشاري أطفال",
      specialtyName: "أطفال",
      areaName: "مدينة نصر",
      yearsOfExperience: 15,
      rating: 4.9,
      reviewCount: 140,
      consultationFee: 350,
      clinicName: "مركز رعاية الطفل",
      clinicAddress: "امتداد رمسيس، مدينة نصر",
      weeklySchedule: EVENING_SCHEDULE,
    },
    {
      nameAr: "د. طارق إبراهيم",
      titleAr: "أخصائي أطفال",
      specialtyName: "أطفال",
      areaName: "مدينة نصر",
      yearsOfExperience: 6,
      rating: 4.5,
      reviewCount: 41,
      consultationFee: 220,
      clinicName: "عيادة السلام",
      clinicAddress: "شارع ذاكر حسين، مدينة نصر",
      weeklySchedule: STANDARD_SCHEDULE,
    },
    {
      nameAr: "د. رانيا حسن",
      titleAr: "طبيبة أطفال",
      specialtyName: "أطفال",
      areaName: "مدينة نصر",
      yearsOfExperience: 4,
      rating: 4.7,
      reviewCount: 38,
      consultationFee: 200,
      clinicName: "عيادة البسمة",
      clinicAddress: "الحي العاشر، مدينة نصر",
      weeklySchedule: scheduleWithoutToday,
    },
    {
      nameAr: "د. حسام الدين فؤاد",
      titleAr: "استشاري أطفال وحديثي الولادة",
      specialtyName: "أطفال",
      areaName: "مدينة نصر",
      yearsOfExperience: 14,
      rating: 4.8,
      reviewCount: 89,
      consultationFee: 350,
      clinicName: "مركز الحياة الطبي",
      clinicAddress: "شارع أحمد فخري، مدينة نصر",
      weeklySchedule: STANDARD_SCHEDULE,
    },
    {
      nameAr: "د. نهى عبد الرحمن",
      titleAr: "أخصائية أطفال",
      specialtyName: "أطفال",
      areaName: "مدينة نصر",
      yearsOfExperience: 8,
      rating: 4.6,
      reviewCount: 67,
      consultationFee: 280,
      clinicName: "عيادة النور",
      clinicAddress: "شارع يوسف عباس، مدينة نصر",
      weeklySchedule: SHORT_WITH_SATURDAY_SCHEDULE,
    },
    {
      nameAr: "د. عمر فاروق",
      titleAr: "أخصائي أطفال",
      specialtyName: "أطفال",
      areaName: "مدينة نصر",
      yearsOfExperience: 5,
      rating: 4.4,
      reviewCount: 29,
      consultationFee: 220,
      clinicName: "عيادة اليسر",
      clinicAddress: "شارع عبد الله العربي، مدينة نصر",
      weeklySchedule: STANDARD_SCHEDULE,
    },
    {
      nameAr: "د. دينا سمير",
      titleAr: "طبيبة أطفال",
      specialtyName: "أطفال",
      areaName: "مدينة نصر",
      yearsOfExperience: 9,
      rating: 4.8,
      reviewCount: 73,
      consultationFee: 300,
      clinicName: "مركز الطفل السعيد",
      clinicAddress: "شارع الطيران، مدينة نصر",
      weeklySchedule: EVENING_SCHEDULE,
    },
    {
      nameAr: "د. وليد نبيل",
      titleAr: "استشاري أطفال",
      specialtyName: "أطفال",
      areaName: "مدينة نصر",
      yearsOfExperience: 11,
      rating: 4.7,
      reviewCount: 58,
      consultationFee: 320,
      clinicName: "عيادة الفجر",
      clinicAddress: "شارع مكرم عبيد، مدينة نصر",
      weeklySchedule: STANDARD_SCHEDULE,
    },
    {
      nameAr: "د. شريف جمال",
      titleAr: "استشاري طب وجراحة العيون",
      specialtyName: "عيون",
      areaName: "مصر الجديدة",
      yearsOfExperience: 13,
      rating: 4.9,
      reviewCount: 130,
      consultationFee: 400,
      clinicName: "مركز الرؤية للعيون",
      clinicAddress: "شارع الثورة، مصر الجديدة",
      weeklySchedule: STANDARD_SCHEDULE,
    },
    {
      nameAr: "د. أميرة فتحي",
      titleAr: "أخصائية عيون",
      specialtyName: "عيون",
      areaName: "التجمع الخامس",
      yearsOfExperience: 7,
      rating: 4.7,
      reviewCount: 49,
      consultationFee: 350,
      clinicName: "عيادة البصر الحديث",
      clinicAddress: "شارع التسعين الشمالي، التجمع الخامس",
      weeklySchedule: EVENING_SCHEDULE,
    },
    {
      nameAr: "د. محمد عبد الله",
      titleAr: "استشاري باطنة",
      specialtyName: "باطنة",
      areaName: "المعادي",
      yearsOfExperience: 16,
      rating: 4.8,
      reviewCount: 115,
      consultationFee: 350,
      clinicName: "عيادة المعادي التخصصية",
      clinicAddress: "شارع 9، المعادي",
      weeklySchedule: STANDARD_SCHEDULE,
    },
    {
      nameAr: "د. علياء سعيد",
      titleAr: "أخصائية باطنة",
      specialtyName: "باطنة",
      areaName: "الدقي",
      yearsOfExperience: 8,
      rating: 4.6,
      reviewCount: 64,
      consultationFee: 280,
      clinicName: "مركز الدقي الطبي",
      clinicAddress: "شارع التحرير، الدقي",
      weeklySchedule: SHORT_WITH_SATURDAY_SCHEDULE,
    },
    {
      nameAr: "د. باسل هشام",
      titleAr: "استشاري باطنة وجهاز هضمي",
      specialtyName: "باطنة",
      areaName: "الجيزة",
      yearsOfExperience: 11,
      rating: 4.7,
      reviewCount: 78,
      consultationFee: 300,
      clinicName: "عيادة الجيزة الطبية",
      clinicAddress: "شارع الهرم، الجيزة",
      weeklySchedule: STANDARD_SCHEDULE,
    },
    {
      nameAr: "د. يارا أشرف",
      titleAr: "أخصائية جلدية وتجميل",
      specialtyName: "جلدية",
      areaName: "التجمع الخامس",
      yearsOfExperience: 6,
      rating: 4.8,
      reviewCount: 92,
      consultationFee: 450,
      clinicName: "مركز كلير للبشرة",
      clinicAddress: "شارع التسعين الجنوبي، التجمع الخامس",
      weeklySchedule: EVENING_SCHEDULE,
    },
    {
      nameAr: "د. سامح رؤوف",
      titleAr: "استشاري أمراض جلدية",
      specialtyName: "جلدية",
      areaName: "المعادي",
      yearsOfExperience: 14,
      rating: 4.7,
      reviewCount: 83,
      consultationFee: 350,
      clinicName: "عيادة دجلة للجلدية",
      clinicAddress: "دجلة، المعادي",
      weeklySchedule: STANDARD_SCHEDULE,
    },
    {
      nameAr: "د. مصطفى كمال",
      titleAr: "استشاري طب الأسنان",
      specialtyName: "أسنان",
      areaName: "الدقي",
      yearsOfExperience: 10,
      rating: 4.9,
      reviewCount: 105,
      consultationFee: 300,
      clinicName: "مركز سمايل للأسنان",
      clinicAddress: "ميدان المساحة، الدقي",
      weeklySchedule: STANDARD_SCHEDULE,
    },
    {
      nameAr: "د. إيناس مجدي",
      titleAr: "أخصائية تقويم الأسنان",
      specialtyName: "أسنان",
      areaName: "مصر الجديدة",
      yearsOfExperience: 7,
      rating: 4.8,
      reviewCount: 71,
      consultationFee: 350,
      clinicName: "عيادة اللؤلؤة",
      clinicAddress: "ميدان روكسي، مصر الجديدة",
      weeklySchedule: SHORT_WITH_SATURDAY_SCHEDULE,
    },
    {
      nameAr: "د. تامر شوقي",
      titleAr: "أخصائي جراحة الفم والأسنان",
      specialtyName: "أسنان",
      areaName: "الجيزة",
      yearsOfExperience: 9,
      rating: 4.6,
      reviewCount: 47,
      consultationFee: 250,
      clinicName: "عيادة الصفوة",
      clinicAddress: "شارع فيصل، الجيزة",
      weeklySchedule: STANDARD_SCHEDULE,
    },
  ];

  const doctorsToInsert = doctorsData.map((doc) => {
    const specialtyId = specialtyMap.get(doc.specialtyName);
    const areaId = areaMap.get(doc.areaName);
    if (!specialtyId || !areaId) {
      throw new Error(`Missing specialty or area for ${doc.nameAr}`);
    }
    return {
      nameAr: doc.nameAr,
      titleAr: doc.titleAr,
      specialty: specialtyId,
      area: areaId,
      yearsOfExperience: doc.yearsOfExperience,
      rating: doc.rating,
      reviewCount: doc.reviewCount,
      consultationFee: doc.consultationFee,
      clinicName: doc.clinicName,
      clinicAddress: doc.clinicAddress,
      weeklySchedule: doc.weeklySchedule,
      isActive: true,
    };
  });

  const insertedDoctors = await Doctor.insertMany(doctorsToInsert);

  const samplePatients = [
    { name: "أحمد محمد علي", phone: "01012345678" },
    { name: "سارة محمود حسن", phone: "01198765432" },
    { name: "خالد إبراهيم", phone: "01234567890" },
  ];

  const appointmentsToInsert = [];
  for (let i = 0; i < 3; i += 1) {
    const doctor = insertedDoctors[i];
    if (!doctor) {
      continue;
    }
    const daySlots = generateDoctorSlots(doctor.weeklySchedule, []);
    const firstSlot = daySlots[0]?.slots[0];
    if (!firstSlot) {
      continue;
    }
    const startsAt = new Date(firstSlot.startsAt);
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);
    const patient = samplePatients[i];
    appointmentsToInsert.push({
      code: generateBookingCode(),
      doctor: doctor._id,
      patientName: patient.name,
      patientPhone: patient.phone,
      startsAt,
      endsAt,
      status: "confirmed" as const,
    });
  }

  if (appointmentsToInsert.length > 0) {
    await Appointment.insertMany(appointmentsToInsert);
  }
}

async function main(): Promise<void> {
  try {
    await runSeed();
    process.stdout.write("Seed completed successfully.\n");
    process.exitCode = 0;
  } catch (err: unknown) {
    process.stderr.write(`Seed failed: ${String(err)}\n`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  void main();
}
