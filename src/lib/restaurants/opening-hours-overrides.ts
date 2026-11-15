import type { OpeningHours } from "./types";

type HoursOverride = {
  name: string;
  timeZone: string;
  opensAt: { hour: number; minute: number };
  closesAt: { hour: number; minute: number };
  sourceUrl: string;
  verifiedOn: string;
};

const overrides: Record<string, HoursOverride> = {};

export function resolveOpeningHours(
  restaurantId: string,
  providerHours: OpeningHours | null,
  providerTimeZone: string | null,
  now: Date,
): {
  openingHours: OpeningHours | null;
  timeZone: string | null;
  openingHoursSourceUrl: string | null;
} {
  const override = Object.hasOwn(overrides, restaurantId)
    ? overrides[restaurantId]
    : undefined;

  if (!override) {
    return {
      openingHours: providerHours,
      timeZone: providerTimeZone,
      openingHoursSourceUrl: null,
    };
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: override.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const firstDay = Date.parse(`${today}T00:00:00Z`);
  const openingMinute = override.opensAt.hour * 60 + override.opensAt.minute;
  const closingMinute = override.closesAt.hour * 60 + override.closesAt.minute;
  const crossesMidnight = closingMinute <= openingMinute;

  // UTC arithmetic advances calendar dates; opening and closing hours stay local.
  const dateAt = (offset: number) =>
    new Date(firstDay + offset * 86_400_000).toISOString().slice(0, 10);

  return {
    openingHours: {
      mode: "nextSevenDays",
      timeRanges: Array.from({ length: 7 }, (_, offset) => ({
        startTime: { date: dateAt(offset), ...override.opensAt },
        endTime: {
          date: dateAt(offset + (crossesMidnight ? 1 : 0)),
          ...override.closesAt,
        },
      })),
    },
    timeZone: override.timeZone,
    openingHoursSourceUrl: override.sourceUrl,
  };
}
