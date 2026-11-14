import type { Restaurant, RestaurantSearchInput, WaitTimeResult } from "./types";

export class ValidationError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`${field} must be a finite number`);
  }
  return value;
}

export function parseSearchInput(value: unknown): RestaurantSearchInput {
  if (!isRecord(value) || !isRecord(value.location)) {
    throw new ValidationError("location is required");
  }

  const latitude = finiteNumber(value.location.latitude, "location.latitude");
  const longitude = finiteNumber(value.location.longitude, "location.longitude");
  const maxTravelDistanceMiles = finiteNumber(
    value.maxTravelDistanceMiles,
    "maxTravelDistanceMiles",
  );

  if (latitude < -90 || latitude > 90) {
    throw new ValidationError("location.latitude must be between -90 and 90");
  }
  if (longitude < -180 || longitude > 180) {
    throw new ValidationError("location.longitude must be between -180 and 180");
  }
  if (maxTravelDistanceMiles <= 0 || maxTravelDistanceMiles > 30) {
    throw new ValidationError("maxTravelDistanceMiles must be between 0 and 30");
  }

  const cuisine = value.cuisine;
  if (cuisine !== undefined && (typeof cuisine !== "string" || !cuisine.trim())) {
    throw new ValidationError("cuisine must be a non-empty string");
  }

  return {
    location: { latitude, longitude },
    maxTravelDistanceMiles,
    ...(typeof cuisine === "string" ? { cuisine: cuisine.trim() } : {}),
  };
}

export function parseWaitTimeInput(value: unknown): {
  restaurants: Restaurant[];
  results: WaitTimeResult[];
} {
  if (!isRecord(value) || !Array.isArray(value.restaurants) || !Array.isArray(value.results)) {
    throw new ValidationError("restaurants and results must be arrays");
  }

  const restaurants = value.restaurants.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.name !== "string" ||
      typeof item.address !== "string" ||
      !isRecord(item.location) ||
      typeof item.location.latitude !== "number" ||
      typeof item.location.longitude !== "number" ||
      !Array.isArray(item.cuisines) ||
      !item.cuisines.every((cuisine) => typeof cuisine === "string") ||
      (item.phone !== null && typeof item.phone !== "string") ||
      (item.website !== null && typeof item.website !== "string") ||
      typeof item.distanceMiles !== "number" ||
      !Number.isFinite(item.distanceMiles) ||
      item.distanceMiles < 0
    ) {
      throw new ValidationError(`restaurants[${index}] is invalid`);
    }
    return item as Restaurant;
  });

  const validStatuses = new Set(["answered", "unavailable", "failed"]);
  const results = value.results.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.restaurantId !== "string" ||
      !validStatuses.has(String(item.status)) ||
      (item.waitMinutes !== null &&
        (typeof item.waitMinutes !== "number" ||
          !Number.isFinite(item.waitMinutes) ||
          item.waitMinutes < 0))
    ) {
      throw new ValidationError(`results[${index}] is invalid`);
    }
    return item as WaitTimeResult;
  });

  return { restaurants, results };
}

