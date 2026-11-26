import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import { generateDoctorSlots, getNextAvailableSlot } from "./slotGenerator.js";
import { IWeeklyScheduleEntry } from "../models/Doctor.js";

describe("slotGenerator", () => {
  it("maps weekdays correctly (0 = Sunday to 6 = Saturday) across 7-day horizon", () => {
    const schedule: IWeeklyScheduleEntry[] = [
      { dayOfWeek: 0, startTime: "10:00", endTime: "11:00" },
      { dayOfWeek: 6, startTime: "14:00", endTime: "15:00" },
    ];
    const now = DateTime.fromISO("2026-11-26T08:00:00", {
      zone: "Africa/Cairo",
    }).toJSDate();

    const days = generateDoctorSlots(schedule, [], now);

    expect(days).toHaveLength(2);
    expect(days[0].date).toBe("2026-11-28");
    expect(days[0].label).toBe("السبت 28");
    expect(days[0].slots).toHaveLength(2);
    expect(days[1].date).toBe("2026-11-29");
    expect(days[1].label).toBe("الأحد 29");
    expect(days[1].slots).toHaveLength(2);
  });

  it("generates 30-minute boundary slots as UTC ISO strings", () => {
    const schedule: IWeeklyScheduleEntry[] = [
      { dayOfWeek: 4, startTime: "10:00", endTime: "11:30" },
    ];
    const now = DateTime.fromISO("2026-11-26T08:00:00", {
      zone: "Africa/Cairo",
    }).toJSDate();

    const days = generateDoctorSlots(schedule, [], now);

    expect(days).toHaveLength(1);
    expect(days[0].slots).toEqual([
      { startsAt: "2026-11-26T08:00:00.000Z" },
      { startsAt: "2026-11-26T08:30:00.000Z" },
      { startsAt: "2026-11-26T09:00:00.000Z" },
    ]);
  });

  it("removes slots that start before now", () => {
    const schedule: IWeeklyScheduleEntry[] = [
      { dayOfWeek: 4, startTime: "10:00", endTime: "12:00" },
    ];
    const now = DateTime.fromISO("2026-11-26T10:45:00", {
      zone: "Africa/Cairo",
    }).toJSDate();

    const days = generateDoctorSlots(schedule, [], now);

    expect(days).toHaveLength(1);
    expect(days[0].slots).toEqual([
      { startsAt: "2026-11-26T09:00:00.000Z" },
      { startsAt: "2026-11-26T09:30:00.000Z" },
    ]);
  });

  it("removes taken slots and omits days with no remaining slots", () => {
    const schedule: IWeeklyScheduleEntry[] = [
      { dayOfWeek: 4, startTime: "10:00", endTime: "11:00" },
      { dayOfWeek: 5, startTime: "10:00", endTime: "11:00" },
    ];
    const now = DateTime.fromISO("2026-11-26T08:00:00", {
      zone: "Africa/Cairo",
    }).toJSDate();

    const taken = [
      new Date("2026-11-26T08:00:00.000Z"),
      new Date("2026-11-26T08:30:00.000Z"),
      new Date("2026-11-27T08:00:00.000Z"),
    ];

    const days = generateDoctorSlots(schedule, taken, now);

    expect(days).toHaveLength(1);
    expect(days[0].date).toBe("2026-11-27");
    expect(days[0].slots).toEqual([{ startsAt: "2026-11-27T08:30:00.000Z" }]);
    expect(getNextAvailableSlot(days)).toBe("2026-11-27T08:30:00.000Z");
  });

  it("handles Africa/Cairo DST transitions accurately", () => {
    const schedule: IWeeklyScheduleEntry[] = [
      { dayOfWeek: 5, startTime: "10:00", endTime: "11:00" },
    ];
    const now = DateTime.fromISO("2026-04-24T08:00:00", {
      zone: "Africa/Cairo",
    }).toJSDate();

    const days = generateDoctorSlots(schedule, [], now);

    expect(days).toHaveLength(1);
    expect(days[0].slots[0].startsAt).toBe("2026-04-24T07:00:00.000Z");
  });

  it("returns null for nextAvailableSlot when no slots remain", () => {
    expect(getNextAvailableSlot([])).toBeNull();
  });
});
