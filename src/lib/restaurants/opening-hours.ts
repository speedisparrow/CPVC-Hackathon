import type { OpeningHours } from "./types";

export function isOpeningHours(value: unknown): value is OpeningHours {
  if (typeof value !== "object" || value === null) return false;
  const hours = value as OpeningHours;
  const validTime = (time: OpeningHours["timeRanges"][number]["startTime"]) =>
    time &&
    /^\d{4}-\d{2}-\d{2}$/.test(time.date) &&
    Number.isInteger(time.hour) &&
    time.hour >= 0 &&
    time.hour <= 23 &&
    Number.isInteger(time.minute) &&
    time.minute >= 0 &&
    time.minute <= 59;
  return (
    hours.mode === "nextSevenDays" &&
    Array.isArray(hours.timeRanges) &&
    hours.timeRanges.every(
      (range) =>
        range && validTime(range.startTime) && validTime(range.endTime),
    )
  );
}

export function isOpenAt(
  hours: OpeningHours | null,
  timeZone: string | null,
  now: Date,
): boolean | null {
  if (!isOpeningHours(hours) || !timeZone) return null;

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const part = (type: string) =>
      parts.find((item) => item.type === type)?.value;
    const localTime = `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
    const timestamp = (time: { date: string; hour: number; minute: number }) =>
      `${time.date}T${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;

    return hours.timeRanges.some(
      (range) =>
        localTime >= timestamp(range.startTime) &&
        localTime < timestamp(range.endTime),
    );
  } catch {
    return null;
  }
}
