import { findNearbyRestaurants } from "./tomtom";
import demoData from "@/data/restaurants.json";
import type { Restaurant, RestaurantSearchInput, WaitTimeResult } from "./types";

export function listCuisines(restaurants: Restaurant[]): string[] {
  const cuisines = new Map<string, string>();
  for (const restaurant of restaurants) {
    for (const cuisine of restaurant.cuisines) {
      cuisines.set(cuisine.toLocaleLowerCase(), cuisine);
    }
  }
  return [...cuisines.values()].sort((a, b) => a.localeCompare(b));
}

export async function discoverRestaurants(input: RestaurantSearchInput) {
  const isDemo = !process.env.TOMTOM_API_KEY?.trim();
  const restaurants: Restaurant[] = isDemo
    ? demoData.restaurants
        .filter((restaurant) => restaurant.distance <= input.maxTravelDistanceMiles)
        .map((restaurant) => ({
          id: restaurant.id,
          name: restaurant.name,
          address: restaurant.city,
          // Fixtures have no coordinates; these are placeholders, not business locations.
          location: input.location,
          cuisines: [restaurant.cuisine],
          phone: restaurant.phone,
          website: null,
          photoUrl: null,
          distanceMiles: restaurant.distance,
          openingHours: null,
          openingHoursSourceUrl: null,
          timeZone: null,
          isOpenNow: null,
        }))
        .sort((a, b) => a.distanceMiles - b.distanceMiles || a.name.localeCompare(b.name))
    : await findNearbyRestaurants(
    input.location,
    input.maxTravelDistanceMiles,
  );
  return { restaurants, cuisines: listCuisines(restaurants), isDemo };
}

export async function filterRestaurants(input: RestaurantSearchInput) {
  const { restaurants, cuisines, isDemo } = await discoverRestaurants(input);
  const selectedCuisine = input.cuisine?.toLocaleLowerCase();
  const filtered = selectedCuisine
    ? restaurants.filter((restaurant) =>
        restaurant.cuisines.some(
          (cuisine) => cuisine.toLocaleLowerCase() === selectedCuisine,
        ),
      )
    : restaurants;

  return { restaurants: filtered, cuisines, isDemo };
}

export function sortByWaitTime(
  restaurants: Restaurant[],
  results: WaitTimeResult[],
) {
  const byRestaurantId = new Map(results.map((result) => [result.restaurantId, result]));
  const sorted = restaurants.map((restaurant) => {
    const result = byRestaurantId.get(restaurant.id);
    const answered = result?.status === "answered" && result.waitMinutes !== null;

    return {
      ...restaurant,
      callStatus: result?.status ?? "pending",
      waitTimeMinutes: answered ? result.waitMinutes : null,
    };
  });

  sorted.sort((a, b) => {
    if (a.waitTimeMinutes === null && b.waitTimeMinutes === null) {
      return a.name.localeCompare(b.name);
    }
    if (a.waitTimeMinutes === null) return 1;
    if (b.waitTimeMinutes === null) return -1;
    return a.waitTimeMinutes - b.waitTimeMinutes || a.name.localeCompare(b.name);
  });

  return { restaurants: sorted };
}

