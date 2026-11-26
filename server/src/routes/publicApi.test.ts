import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import request from "supertest";
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { DateTime } from "luxon";
import { app } from "../app.js";
import { Specialty } from "../models/Specialty.js";
import { Area } from "../models/Area.js";
import { Doctor } from "../models/Doctor.js";
import { Appointment } from "../models/Appointment.js";

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Appointment.deleteMany({});
  await Doctor.deleteMany({});
  await Specialty.deleteMany({});
  await Area.deleteMany({});
});

function getTomorrowSchedule(): {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}[] {
  const tomorrow = DateTime.now().setZone("Africa/Cairo").plus({ days: 1 });
  return [
    {
      dayOfWeek: tomorrow.weekday % 7,
      startTime: "10:00",
      endTime: "12:00",
    },
  ];
}

function getDayAfterTomorrowSchedule(): {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}[] {
  const dayAfter = DateTime.now().setZone("Africa/Cairo").plus({ days: 2 });
  return [
    {
      dayOfWeek: dayAfter.weekday % 7,
      startTime: "14:00",
      endTime: "16:00",
    },
  ];
}

async function seedFixture() {
  const [pediatrics, dental] = await Specialty.insertMany([
    { nameAr: "أطفال" },
    { nameAr: "أسنان" },
  ]);
  const [nasrCity, maadi] = await Area.insertMany([
    { nameAr: "مدينة نصر" },
    { nameAr: "المعادي" },
  ]);

  const tomorrowSchedule = getTomorrowSchedule();
  const dayAfterSchedule = getDayAfterTomorrowSchedule();

  const [
    docEarliest,
    docHigherRating,
    docCheapest,
    docNoSchedule,
    docInactive,
  ] = await Doctor.insertMany([
    {
      nameAr: "د. مريم أحمد",
      titleAr: "طبيبة أطفال",
      specialty: pediatrics._id,
      area: nasrCity._id,
      yearsOfExperience: 8,
      rating: 4.5,
      reviewCount: 120,
      consultationFee: 300,
      clinicName: "عيادة الشفاء",
      clinicAddress: "شارع مكرم عبيد",
      weeklySchedule: tomorrowSchedule,
      isActive: true,
    },
    {
      nameAr: "د. ياسر علي",
      titleAr: "استشاري أطفال",
      specialty: pediatrics._id,
      area: nasrCity._id,
      yearsOfExperience: 12,
      rating: 4.9,
      reviewCount: 95,
      consultationFee: 400,
      clinicName: "مركز النيل",
      clinicAddress: "شارع عباس العقاد",
      weeklySchedule: dayAfterSchedule,
      isActive: true,
    },
    {
      nameAr: "د. أحمد سامي",
      titleAr: "أخصائي أسنان",
      specialty: dental._id,
      area: maadi._id,
      yearsOfExperience: 6,
      rating: 4.2,
      reviewCount: 50,
      consultationFee: 200,
      clinicName: "عيادة الابتسامة",
      clinicAddress: "شارع 9",
      weeklySchedule: dayAfterSchedule,
      isActive: true,
    },
    {
      nameAr: "د. سلمى عادل",
      titleAr: "طبيبة أطفال",
      specialty: pediatrics._id,
      area: nasrCity._id,
      yearsOfExperience: 5,
      rating: 4.7,
      reviewCount: 62,
      consultationFee: 250,
      clinicName: "عيادة الرحمة",
      clinicAddress: "شارع مصطفى النحاس",
      weeklySchedule: [],
      isActive: true,
    },
    {
      nameAr: "د. غير نشط",
      titleAr: "أخصائي أطفال",
      specialty: pediatrics._id,
      area: nasrCity._id,
      yearsOfExperience: 10,
      rating: 5.0,
      reviewCount: 200,
      consultationFee: 100,
      clinicName: "عيادة قديمة",
      clinicAddress: "عنوان قديم",
      weeklySchedule: tomorrowSchedule,
      isActive: false,
    },
  ]);

  return {
    pediatrics,
    dental,
    nasrCity,
    maadi,
    docEarliest,
    docHigherRating,
    docCheapest,
    docNoSchedule,
    docInactive,
  };
}

describe("GET /api/metadata", () => {
  it("returns specialties and areas", async () => {
    await seedFixture();
    const res = await request(app).get("/api/metadata");

    expect(res.status).toBe(200);
    expect(res.body.specialties).toHaveLength(2);
    expect(res.body.areas).toHaveLength(2);
    expect(res.body.specialties[0]).toEqual({
      id: expect.any(String),
      nameAr: "أطفال",
    });
  });

  it("returns 500 error format if database query fails", async () => {
    vi.spyOn(Specialty, "find").mockImplementationOnce(() => {
      throw new Error("db failure");
    });

    const res = await request(app).get("/api/metadata");

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
  });
});

describe("GET /api/doctors", () => {
  it("returns only active doctors with expected shape and excludes inactive", async () => {
    await seedFixture();
    const res = await request(app).get("/api/doctors");

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(4);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(10);
    expect(res.body.items).toHaveLength(4);

    const names = res.body.items.map((d: { nameAr: string }) => d.nameAr);
    expect(names).not.toContain("د. غير نشط");

    const first = res.body.items[0];
    expect(first).toEqual({
      id: expect.any(String),
      nameAr: "د. مريم أحمد",
      titleAr: "طبيبة أطفال",
      specialty: { id: expect.any(String), nameAr: "أطفال" },
      area: { id: expect.any(String), nameAr: "مدينة نصر" },
      yearsOfExperience: 8,
      rating: 4.5,
      reviewCount: 120,
      consultationFee: 300,
      clinicName: "عيادة الشفاء",
      clinicAddress: "شارع مكرم عبيد",
      workingHoursLabel: "10:00 - 12:00",
      nextAvailableSlot: expect.any(String),
    });
  });

  it("places doctors with no schedule last under sort=earliest with nextAvailableSlot null", async () => {
    await seedFixture();
    const res = await request(app).get("/api/doctors?sort=earliest");

    expect(res.status).toBe(200);
    const items = res.body.items;
    expect(items[0].nameAr).toBe("د. مريم أحمد");
    expect(items[items.length - 1].nameAr).toBe("د. سلمى عادل");
    expect(items[items.length - 1].nextAvailableSlot).toBeNull();
  });

  it("filters by specialtyId, areaId, minRating, and maxFee", async () => {
    const { pediatrics, nasrCity } = await seedFixture();

    const bySpecialty = await request(app).get(
      `/api/doctors?specialtyId=${String(pediatrics._id)}`,
    );
    expect(bySpecialty.status).toBe(200);
    expect(bySpecialty.body.total).toBe(3);

    const byArea = await request(app).get(
      `/api/doctors?areaId=${String(nasrCity._id)}`,
    );
    expect(byArea.status).toBe(200);
    expect(byArea.body.total).toBe(3);

    const byRating = await request(app).get("/api/doctors?minRating=4.7");
    expect(byRating.status).toBe(200);
    expect(byRating.body.total).toBe(2);

    const byFee = await request(app).get("/api/doctors?maxFee=250");
    expect(byFee.status).toBe(200);
    expect(byFee.body.total).toBe(2);
  });

  it("sorts by rating and fee", async () => {
    await seedFixture();

    const byRating = await request(app).get("/api/doctors?sort=rating");
    expect(byRating.status).toBe(200);
    expect(byRating.body.items[0].nameAr).toBe("د. ياسر علي");

    const byFee = await request(app).get("/api/doctors?sort=fee");
    expect(byFee.status).toBe(200);
    expect(byFee.body.items[0].nameAr).toBe("د. أحمد سامي");
  });

  it("paginates results with page and pageSize", async () => {
    await seedFixture();

    const res = await request(app).get(
      "/api/doctors?sort=fee&page=2&pageSize=2",
    );
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(4);
    expect(res.body.page).toBe(2);
    expect(res.body.pageSize).toBe(2);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].nameAr).toBe("د. مريم أحمد");
  });

  it("returns 400 VALIDATION_ERROR with fields map for invalid query params", async () => {
    const res = await request(app).get(
      "/api/doctors?specialtyId=bad&areaId=bad&minRating=6&maxFee=-10&sort=invalid&page=0&pageSize=25",
    );

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.fields).toHaveProperty("specialtyId");
    expect(res.body.error.fields).toHaveProperty("areaId");
    expect(res.body.error.fields).toHaveProperty("minRating");
    expect(res.body.error.fields).toHaveProperty("maxFee");
    expect(res.body.error.fields).toHaveProperty("sort");
    expect(res.body.error.fields).toHaveProperty("page");
    expect(res.body.error.fields).toHaveProperty("pageSize");
  });
});

describe("GET /api/doctors/:id", () => {
  it("returns doctor details including weeklySchedule", async () => {
    const { docEarliest } = await seedFixture();
    const res = await request(app).get(
      `/api/doctors/${String(docEarliest._id)}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(String(docEarliest._id));
    expect(res.body.weeklySchedule).toHaveLength(1);
    expect(res.body.weeklySchedule[0].startTime).toBe("10:00");
  });

  it("returns 404 NOT_FOUND for malformed, unknown, or inactive doctor id", async () => {
    const { docInactive } = await seedFixture();

    const malformed = await request(app).get("/api/doctors/not-valid-id");
    expect(malformed.status).toBe(404);
    expect(malformed.body.error.code).toBe("NOT_FOUND");

    const unknown = await request(app).get(
      `/api/doctors/${String(new Types.ObjectId())}`,
    );
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe("NOT_FOUND");

    const inactive = await request(app).get(
      `/api/doctors/${String(docInactive._id)}`,
    );
    expect(inactive.status).toBe(404);
    expect(inactive.body.error.code).toBe("NOT_FOUND");
  });
});

describe("GET /api/doctors/:id/slots", () => {
  it("returns available slots and excludes confirmed appointments", async () => {
    const { docEarliest } = await seedFixture();

    const initialRes = await request(app).get(
      `/api/doctors/${String(docEarliest._id)}/slots`,
    );
    expect(initialRes.status).toBe(200);
    expect(initialRes.body.days).toHaveLength(1);
    expect(initialRes.body.days[0].slots).toHaveLength(4);

    const firstSlotIso: string = initialRes.body.days[0].slots[0].startsAt;
    const secondSlotIso: string = initialRes.body.days[0].slots[1].startsAt;

    await Appointment.insertMany([
      {
        code: "ABCD2345",
        doctor: docEarliest._id,
        patientName: "مريض مؤكد",
        patientPhone: "01012345678",
        startsAt: new Date(firstSlotIso),
        endsAt: new Date(new Date(firstSlotIso).getTime() + 30 * 60 * 1000),
        status: "confirmed",
      },
      {
        code: "EFGH6789",
        doctor: docEarliest._id,
        patientName: "مريض ملغي",
        patientPhone: "01012345679",
        startsAt: new Date(secondSlotIso),
        endsAt: new Date(new Date(secondSlotIso).getTime() + 30 * 60 * 1000),
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: "patient",
      },
    ]);

    const afterBookingRes = await request(app).get(
      `/api/doctors/${String(docEarliest._id)}/slots`,
    );
    expect(afterBookingRes.status).toBe(200);
    const remainingSlots = afterBookingRes.body.days[0].slots.map(
      (s: { startsAt: string }) => s.startsAt,
    );
    expect(remainingSlots).toHaveLength(3);
    expect(remainingSlots).not.toContain(firstSlotIso);
    expect(remainingSlots).toContain(secondSlotIso);
  });

  it("returns 404 NOT_FOUND for malformed or unknown doctor id", async () => {
    const malformed = await request(app).get("/api/doctors/bad-id/slots");
    expect(malformed.status).toBe(404);
    expect(malformed.body.error.code).toBe("NOT_FOUND");

    const unknown = await request(app).get(
      `/api/doctors/${String(new Types.ObjectId())}/slots`,
    );
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe("NOT_FOUND");
  });
});
