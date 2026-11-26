import { DateTime } from "luxon";
import { ar } from "../content/ar.js";
import { IWeeklyScheduleEntry } from "../models/Doctor.js";

const CAIRO_ZONE = "Africa/Cairo";
const HORIZON_DAYS = 7;
const SLOT_DURATION_MINUTES = 30;

export interface GeneratedSlot {
  startsAt: string;
}

export interface GeneratedDaySlots {
  date: string;
  label: string;
  slots: GeneratedSlot[];
}

function parseTime(timeStr: string): { hour: number; minute: number } | null {
  const match = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || (minute !== 0 && minute !== 30)) {
    return null;
  }
  return { hour, minute };
}

function toDayOfWeek(luxonWeekday: number): number {
  return luxonWeekday % 7;
}

function formatDayLabel(day: DateTime): string {
  const weekdayName = ar.weekdays[toDayOfWeek(day.weekday)] ?? "";
  return `${weekdayName} ${day.day}`;
}

export function generateDoctorSlots(
  weeklySchedule: ReadonlyArray<IWeeklyScheduleEntry>,
  takenStartsAt: ReadonlyArray<Date>,
  now: Date = new Date(),
): GeneratedDaySlots[] {
  const nowCairo = DateTime.fromJSDate(now, { zone: CAIRO_ZONE });
  const todayStart = nowCairo.startOf("day");
  const takenMillis = new Set(takenStartsAt.map((d) => d.getTime()));

  const scheduleByDay = new Map<number, IWeeklyScheduleEntry>();
  for (const entry of weeklySchedule) {
    scheduleByDay.set(entry.dayOfWeek, entry);
  }

  const days: GeneratedDaySlots[] = [];

  for (let offset = 0; offset < HORIZON_DAYS; offset += 1) {
    const currentDay = todayStart.plus({ days: offset });
    const dayOfWeek = toDayOfWeek(currentDay.weekday);
    const entry = scheduleByDay.get(dayOfWeek);
    if (!entry) {
      continue;
    }

    const startParts = parseTime(entry.startTime);
    const endParts = parseTime(entry.endTime);
    if (!startParts || !endParts) {
      continue;
    }

    let cursor = currentDay.set({
      hour: startParts.hour,
      minute: startParts.minute,
      second: 0,
      millisecond: 0,
    });
    const endTime = currentDay.set({
      hour: endParts.hour,
      minute: endParts.minute,
      second: 0,
      millisecond: 0,
    });

    if (cursor >= endTime) {
      continue;
    }

    const slots: GeneratedSlot[] = [];

    while (cursor < endTime) {
      const cursorMillis = cursor.toMillis();
      if (
        cursorMillis >= nowCairo.toMillis() &&
        !takenMillis.has(cursorMillis)
      ) {
        const iso = cursor.toUTC().toISO();
        if (iso) {
          slots.push({ startsAt: iso });
        }
      }
      cursor = cursor.plus({ minutes: SLOT_DURATION_MINUTES });
    }

    if (slots.length > 0) {
      const dateStr = currentDay.toISODate();
      if (dateStr) {
        days.push({
          date: dateStr,
          label: formatDayLabel(currentDay),
          slots,
        });
      }
    }
  }

  return days;
}

export function getNextAvailableSlot(
  days: ReadonlyArray<GeneratedDaySlots>,
): string | null {
  for (const day of days) {
    if (day.slots.length > 0) {
      return day.slots[0].startsAt;
    }
  }
  return null;
}
