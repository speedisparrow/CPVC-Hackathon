import type { Coordinates, OpeningHours, Restaurant } from "./types";
import { isOpenAt, isOpeningHours } from "./opening-hours";
import { resolveOpeningHours } from "./opening-hours-overrides";
import type { PoiPhotoReferences } from "./photos";
// import { restaurantPhotoUrl } from "./photos";

const SEARCH_URL = "https://api.tomtom.com/search/2/nearbySearch/.json";
const ROUTING_URL = "https://api.tomtom.com/routing/1/calculateRoute";
const RESTAURANT_CATEGORY_ID = "7315";
const METERS_PER_MILE = 1_609.344;
const GENERIC_LABELS = new Set([
  "restaurant",
  "food",
  "eating and drinking",
  "casual dining",
  "fast food",
]);

type TomTomSearchResult = {
  id: string;
  position: { lat: number; lon: number };
  address?: { freeformAddress?: string };
  dataSources?: { poiDetails?: PoiPhotoReferences };
  poi?: {
    name?: string;
    phone?: string;
    url?: string;
    openingHours?: OpeningHours;
    timeZone?: { ianaId?: string };
    categories?: string[];
    classifications?: Array<{
      names?: Array<{ name?: string }>;
    }>;
  };
};

type TomTomSearchResponse = { results?: TomTomSearchResult[] };
type TomTomRouteResponse = {
  routes?: Array<{
    summary?: { lengthInMeters?: number };
  }>;
};

export class RestaurantProviderError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
  ) {
    super(message);
  }
}

function apiKey(): string {
  const key = process.env.TOMTOM_API_KEY;
  if (!key) {
    throw new RestaurantProviderError(
      "Restaurant provider is not configured. Set TOMTOM_API_KEY.",
      503,
    );
  }
  return key;
}

async function getJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const detail = await response.text();
    throw new RestaurantProviderError(
      `TomTom request failed (${response.status}): ${detail.slice(0, 200)}`,
    );
  }
  return (await response.json()) as T;
}

function titleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function cuisinesFor(result: TomTomSearchResult): string[] {
  const labels = [
    ...(result.poi?.classifications ?? []).flatMap((classification) =>
      (classification.names ?? []).flatMap((item) =>
        item.name ? [item.name] : [],
      ),
    ),
    ...(result.poi?.categories ?? []),
  ];

  const unique = new Map<string, string>();
  for (const rawLabel of labels) {
    const label = rawLabel.trim();
    const key = label.toLocaleLowerCase();
    if (label && !GENERIC_LABELS.has(key)) unique.set(key, titleCase(label));
  }
  return [...unique.values()].sort((a, b) => a.localeCompare(b));
}

function searchRadius(maxTravelDistanceMiles: number): number {
  // Route distance cannot be shorter than straight-line distance, so this radius
  // safely prefilters candidates before their routed distances are calculated.
  return Math.min(
    50_000,
    Math.max(100, Math.ceil(maxTravelDistanceMiles * METERS_PER_MILE)),
  );
}

async function routeSummary(
  origin: Coordinates,
  destination: Coordinates,
): Promise<{ lengthInMeters: number } | null> {
  const points = `${origin.latitude},${origin.longitude}:${destination.latitude},${destination.longitude}`;
  const url = new URL(`${ROUTING_URL}/${points}/json`);
  url.searchParams.set("key", apiKey());
  url.searchParams.set("travelMode", "car");
  url.searchParams.set("routeType", "fastest");

  const data = await getJson<TomTomRouteResponse>(url);
  const summary = data.routes?.[0]?.summary;
  if (summary?.lengthInMeters === undefined) {
    return null;
  }
  return {
    lengthInMeters: summary.lengthInMeters,
  };
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const output = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      output[index] = await mapper(values[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () =>
      worker(),
    ),
  );
  return output;
}

export async function findNearbyRestaurants(
  origin: Coordinates,
  maxTravelDistanceMiles: number,
): Promise<Restaurant[]> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set("key", apiKey());
  url.searchParams.set("lat", String(origin.latitude));
  url.searchParams.set("lon", String(origin.longitude));
  url.searchParams.set("radius", String(searchRadius(maxTravelDistanceMiles)));
  url.searchParams.set("categorySet", RESTAURANT_CATEGORY_ID);
  url.searchParams.set("limit", "100");
  url.searchParams.set("openingHours", "nextSevenDays");
  url.searchParams.set("timeZone", "iana");

  const data = await getJson<TomTomSearchResponse>(url);
  const maximumCandidates = Math.min(
    100,
    Math.max(1, Number(process.env.MAX_ROUTE_CANDIDATES ?? 40) || 40),
  );
  const candidates = (data.results ?? [])
    .filter((result) => result.poi?.name && result.position)
    .slice(0, maximumCandidates);

  const restaurants = await mapWithConcurrency(
    candidates,
    5,
    async (result): Promise<Restaurant | null> => {
      const location = {
        latitude: result.position.lat,
        longitude: result.position.lon,
      };
      const summary = await routeSummary(origin, location);
      if (!summary) return null;

      const distanceMiles = summary.lengthInMeters / METERS_PER_MILE;
      if (distanceMiles > maxTravelDistanceMiles) return null;

      const providerHours = isOpeningHours(result.poi?.openingHours)
        ? result.poi.openingHours
        : null;
      const now = new Date();
      const { openingHours, timeZone, openingHoursSourceUrl } =
        resolveOpeningHours(
          result.id,
          providerHours,
          result.poi?.timeZone?.ianaId ?? null,
          now,
        );

      return {
        id: result.id,
        name: result.poi?.name ?? "Unknown restaurant",
        address: result.address?.freeformAddress ?? "",
        location,
        cuisines: cuisinesFor(result),
        phone: result.poi?.phone ?? null,
        website: result.poi?.url ?? null,
        // photoUrl: restaurantPhotoUrl(result.dataSources?.poiDetails),
        photoUrl: null,
        distanceMiles: Math.round(distanceMiles * 100) / 100,
        openingHours,
        openingHoursSourceUrl,
        timeZone,
        isOpenNow: isOpenAt(openingHours, timeZone, now),
      } satisfies Restaurant;
    },
  );

  return restaurants
    .filter((restaurant): restaurant is Restaurant => restaurant !== null)
    .sort(
      (a, b) =>
        a.distanceMiles - b.distanceMiles || a.name.localeCompare(b.name),
    );
}
