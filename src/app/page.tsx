"use client";

import { useState } from "react";
import { useUserLocation } from "@/components/location-provider";
import type { Restaurant } from "@/lib/restaurants/types";

type DiscoverResponse = {
  restaurants: Restaurant[];
  cuisines: string[];
  error?: string;
};

export default function Home() {
  const [step, setStep] = useState(1);
  const [distance, setDistance] = useState("5");
  const [customMiles, setCustomMiles] = useState("");
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const {
    location,
    status: locationStatus,
    error: locationError,
    requestLocation,
  } = useUserLocation();
  const isFinished = step > 2;
  const maxDistance = Number(distance === "custom" ? customMiles : distance);

  async function loadRestaurants() {
    if (!location) {
      setFetchError("Allow location access before searching for restaurants.");
      requestLocation();
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    setSelectedRestaurants([]);

    try {
      const response = await fetch("/api/restaurants/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location,
          maxTravelDistanceMiles: maxDistance,
        }),
      });
      const data = (await response.json()) as DiscoverResponse;
      if (!response.ok) {
        throw new Error(data.error || "Unable to load nearby restaurants.");
      }

      setRestaurants(data.restaurants);
      setStep(2);
    } catch (error) {
      setRestaurants([]);
      setFetchError(
        error instanceof Error ? error.message : "Unable to load nearby restaurants.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="setup-screen">
      <section
        className={`setup-wizard${isFinished ? " setup-wizard-finished" : ""}`}
        aria-labelledby="setup-title"
        aria-hidden={isFinished}
        inert={isFinished}
      >
        <p className="setup-step" aria-live="polite">
          Step {Math.min(step, 2)} of 2
        </p>
        <h1 id="setup-title">
          {step === 1 ? "How far would you go?" : "Where would you like to go?"}
        </h1>
        <p className="setup-description">
          {step === 1
            ? "Choose your maximum distance in miles."
            : "Pick one or more restaurants."}
        </p>

        {step === 1 ? (
          <form
            className="setup-distance"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!Number.isFinite(maxDistance) || maxDistance <= 0) return;
              await loadRestaurants();
            }}
          >
            <label htmlFor="distance">Miles away</label>
            <select
              id="distance"
              name="distance"
              value={distance}
              onChange={(event) => setDistance(event.target.value)}
            >
              {[5, 10, 15, 20].map((miles) => (
                <option key={miles} value={miles}>
                  {miles} miles away
                </option>
              ))}
              <option value="custom">Custom distance</option>
            </select>
            {distance === "custom" && (
              <div className="setup-custom-distance">
                <label htmlFor="custom-miles">Custom distance (miles)</label>
                <input
                  id="custom-miles"
                  name="customMiles"
                  type="number"
                  inputMode="decimal"
                  min="0.1"
                  max="30"
                  step="any"
                  placeholder="Enter miles"
                  value={customMiles}
                  onChange={(event) => setCustomMiles(event.target.value)}
                  required
                />
              </div>
            )}
            {locationStatus === "requesting" && (
              <p className="restaurant-note" role="status">
                Waiting for location access…
              </p>
            )}
            {(locationStatus === "denied" ||
              locationStatus === "unavailable" ||
              locationStatus === "error") && (
              <p className="restaurant-empty" role="alert">
                {locationError || "Location access is required to find restaurants."}
              </p>
            )}
            {fetchError && (
              <p className="restaurant-empty" role="alert">
                {fetchError}
              </p>
            )}
            <button
              type="submit"
              disabled={isLoading || locationStatus === "requesting"}
            >
              {isLoading ? "Finding restaurants…" : "Continue"}
            </button>
            {!location && locationStatus !== "requesting" && (
              <button
                type="button"
                className="setup-back"
                onClick={requestLocation}
              >
                Request location again
              </button>
            )}
          </form>
        ) : (
          <form
            className="setup-distance setup-restaurants"
            onSubmit={(event) => {
              event.preventDefault();
              if (selectedRestaurants.length > 0) setStep(3);
            }}
          >
            <span className="restaurant-label" id="restaurant-label">
              Restaurants within {maxDistance} miles
            </span>
            <div
              className="restaurant-list"
              role="group"
              aria-labelledby="restaurant-label"
            >
              {restaurants.map((restaurant) => (
                <label className="restaurant-row" key={restaurant.id}>
                  <span className="restaurant-image" aria-hidden="true" />
                  <span className="restaurant-info">
                    <strong>{restaurant.name}</strong>
                    <span>
                      {restaurant.distanceMiles.toFixed(2)} miles ·{" "}
                      {restaurant.cuisines.join(", ") || "Restaurant"}
                    </span>
                    <span className="restaurant-phone">
                      {restaurant.phone || "Phone unavailable"}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    name="restaurants"
                    value={restaurant.id}
                    aria-label={restaurant.name}
                    checked={selectedRestaurants.includes(restaurant.id)}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSelectedRestaurants((current) =>
                        checked
                          ? [...current, restaurant.id]
                          : current.filter((id) => id !== restaurant.id),
                      );
                    }}
                  />
                </label>
              ))}
              {restaurants.length === 0 && (
                <p className="restaurant-empty" role="status">
                  No restaurants within {maxDistance} miles. Try a larger
                  distance.
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={selectedRestaurants.length === 0 || isFinished}
            >
              Continue
            </button>
            <button
              type="button"
              className="setup-back"
              onClick={() => {
                setFetchError(null);
                setStep(1);
              }}
            >
              Change distance
            </button>
          </form>
        )}

        <div className="setup-progress" aria-hidden="true">
          {[1, 2].map((number) => (
            <span key={number} className={number <= step ? "filled" : ""} />
          ))}
        </div>
      </section>
    </main>
  );
}
