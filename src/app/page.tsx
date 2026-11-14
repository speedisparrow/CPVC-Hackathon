"use client";

import { useEffect, useRef, useState } from "react";
import { useUserLocation } from "@/components/location-provider";
// import { RestaurantImage } from "@/components/restaurant-image";
import type { Restaurant } from "@/lib/restaurants/types";

type DiscoverResponse = {
  restaurants: Restaurant[];
  cuisines: string[];
  error?: string;
};

export default function Home() {
  const [step, setStep] = useState(0);
  const [distance, setDistance] = useState("5");
  const [customMiles, setCustomMiles] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const confirmationRef = useRef<HTMLDialogElement>(null);
  const waitingTitleRef = useRef<HTMLHeadingElement>(null);
  const {
    location,
    status: locationStatus,
    error: locationError,
    requestLocation,
  } = useUserLocation();

  const maxDistance = Number(distance === "custom" ? customMiles : distance);
  const filteredRestaurants = restaurants.filter(
    (restaurant) =>
      selectedCuisines.length === 0 ||
      restaurant.cuisines.some((cuisine) => selectedCuisines.includes(cuisine)),
  );
  const restaurantsToConfirm = filteredRestaurants.filter((restaurant) =>
    selectedRestaurants.includes(restaurant.id),
  );

  useEffect(() => {
    if (step === 4) waitingTitleRef.current?.focus();
  }, [step]);

  async function loadRestaurants() {
    if (!location) {
      setFetchError("Allow location access before searching for restaurants.");
      requestLocation();
      return;
    }

    setIsLoading(true);
    setFetchError(null);
    setSelectedCuisines([]);
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
      setCuisines(data.cuisines);
      setStep(2);
    } catch (error) {
      setRestaurants([]);
      setCuisines([]);
      setFetchError(
        error instanceof Error
          ? error.message
          : "Unable to load nearby restaurants.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (step === 0) {
    const locating = locationStatus === "requesting";
    const hasLocation = locationStatus === "granted" && location !== null;

    return (
      <main className="setup-screen">
        <section className="setup-wizard" aria-labelledby="location-title">
          <p className="setup-step">Before we start</p>
          <h1 id="location-title">Where are you starting from?</h1>
          <p className="setup-description">
            Share your location to find restaurants near you.
          </p>
          <div className="setup-distance location-actions">
            {hasLocation ? (
              <button type="button" onClick={() => setStep(1)}>
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={requestLocation}
                disabled={locating}
                aria-busy={locating}
                aria-describedby="location-note"
              >
                {locating ? "Finding your location…" : "Use my location"}
              </button>
            )}
            {locationError && !hasLocation && (
              <p className="location-error" role="alert">
                {locationError}
              </p>
            )}
            <p className="restaurant-note" id="location-note">
              Your coordinates are sent to the restaurant API only when you
              search.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (step === 4) {
    return (
      <main className="setup-screen">
        <section className="setup-wizard" aria-labelledby="waiting-title">
          <div className="call-waiting-icon" aria-hidden="true">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m5 3 4 1 1 5-3 2a14 14 0 0 0 6 6l2-3 5 1 1 4c0 2-2 3-4 2C9 19 5 15 3 7 2 5 3 3 5 3Z" />
            </svg>
          </div>
          <p className="setup-step" role="status">
            Your selections are confirmed
          </p>
          <h1 id="waiting-title" ref={waitingTitleRef} tabIndex={-1}>
            Hang tight.
          </h1>
          <p className="setup-description">
            Please wait a moment while the calls go through.
          </p>
          <div className="setup-distance setup-restaurants">
            <div className="restaurant-list" aria-label="Confirmed restaurants">
              {restaurantsToConfirm.map((restaurant) => (
                <div className="call-waiting-row" key={restaurant.id}>
                  {/* <RestaurantImage
                    name={restaurant.name}
                    photoUrl={restaurant.photoUrl}
                  /> */}
                  <div className="restaurant-info">
                    <strong>{restaurant.name}</strong>
                    <span>{restaurant.phone || "Phone unavailable"}</span>
                    <span>Waiting to call</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="restaurant-note">
              Preview only. Calling isn’t connected yet.
            </p>
            <button
              type="button"
              className="setup-back"
              onClick={() => setStep(3)}
            >
              Back to selections
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="setup-screen">
      <section className="setup-wizard" aria-labelledby="setup-title">
        <p className="setup-step" aria-live="polite">
          Step {Math.min(step, 3)} of 3
        </p>
        <h1 id="setup-title">
          {step === 1
            ? "How far would you go?"
            : step === 2
              ? "What are you in the mood for?"
              : "Where would you like to go?"}
        </h1>
        <p className="setup-description">
          {step === 1
            ? "Choose your maximum distance in miles."
            : step === 2
              ? "Choose one or more cuisines you’d like."
              : "Pick one or more restaurants."}
        </p>

        {step === 1 ? (
          <form
            key="distance"
            className="setup-distance"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!Number.isFinite(maxDistance) || maxDistance <= 0) return;
              await loadRestaurants();
            }}
          >
            <p className="restaurant-note">Using your current location.</p>
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
            {fetchError && (
              <p className="restaurant-empty" role="alert">
                {fetchError}
              </p>
            )}
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Finding restaurants…" : "Continue"}
            </button>
          </form>
        ) : step === 2 ? (
          <form
            key="cuisine"
            className="setup-distance setup-cuisines"
            onSubmit={(event) => {
              event.preventDefault();
              setSelectedRestaurants([]);
              setStep(3);
            }}
          >
            <span className="restaurant-label" id="cuisines-label">
              Cuisines
            </span>
            <div
              className="cuisine-grid"
              role="group"
              aria-labelledby="cuisines-label"
              aria-describedby="cuisine-hint"
            >
              {cuisines.map((type) => (
                <label key={type} className="cuisine-option">
                  {/* <span className="cuisine-image" aria-hidden="true" /> */}
                  <span className="cuisine-option-footer">
                    <span>{type}</span>
                    <input
                      type="checkbox"
                      name="cuisines"
                      value={type}
                      checked={selectedCuisines.includes(type)}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setSelectedCuisines((current) =>
                          checked
                            ? [...current, type]
                            : current.filter((selected) => selected !== type),
                        );
                      }}
                    />
                  </span>
                </label>
              ))}
              {cuisines.length === 0 && (
                <p className="restaurant-empty" role="status">
                  No cuisines were returned for this distance.
                </p>
              )}
            </div>
            <p className="restaurant-note" id="cuisine-hint">
              Leave all unchecked for any cuisine.
            </p>
            <button type="submit">Continue</button>
            <button
              type="button"
              className="setup-back"
              onClick={() => setStep(1)}
            >
              Change distance
            </button>
          </form>
        ) : (
          <form
            key="restaurants"
            className="setup-distance setup-restaurants"
            onSubmit={(event) => {
              event.preventDefault();
              if (restaurantsToConfirm.length > 0)
                confirmationRef.current?.showModal();
            }}
          >
            <span className="restaurant-label" id="restaurant-label">
              {selectedCuisines.length === 0
                ? "All cuisines"
                : selectedCuisines.length === 1
                  ? selectedCuisines[0]
                  : selectedCuisines.length + " cuisines"}{" "}
              · Within {maxDistance} miles
            </span>
            <div
              className="restaurant-list"
              role="group"
              aria-labelledby="restaurant-label"
            >
              {filteredRestaurants.map((restaurant) => (
                <label className="restaurant-row" key={restaurant.id}>
                  {/* <RestaurantImage
                    name={restaurant.name}
                    photoUrl={restaurant.photoUrl}
                  /> */}
                  <span className="restaurant-info">
                    <strong>{restaurant.name}</strong>
                    <span>
                      {restaurant.distanceMiles.toFixed(2)} miles ·{" "}
                      {restaurant.cuisines.join(", ") || "Restaurant"}
                    </span>
                    <span className="restaurant-phone">
                      {restaurant.phone || "Phone unavailable"}
                    </span>
                    {restaurant.openingHoursSourceUrl && (
                      <span>Hours from restaurant website</span>
                    )}
                    {restaurant.isOpenNow === false ? (
                      <span className="restaurant-closed">May be closed</span>
                    ) : restaurant.isOpenNow == null ? (
                      <span>Hours unavailable</span>
                    ) : null}
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
              {filteredRestaurants.length === 0 && (
                <p className="restaurant-empty" role="status">
                  No restaurants match your choices within {maxDistance} miles.
                  Try another cuisine or a larger distance.
                </p>
              )}
            </div>
            <button type="submit" disabled={selectedRestaurants.length === 0}>
              Continue
            </button>
            <button
              type="button"
              className="setup-back"
              onClick={() => setStep(2)}
            >
              Change cuisine
            </button>
          </form>
        )}

        <div className="setup-progress" aria-hidden="true">
          {[1, 2, 3].map((number) => (
            <span key={number} className={number <= step ? "filled" : ""} />
          ))}
        </div>
      </section>
      <dialog
        ref={confirmationRef}
        className="confirmation-dialog"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-description"
      >
        <div className="confirmation-content">
          <button
            type="button"
            className="confirmation-close"
            aria-label="Close confirmation"
            onClick={() => confirmationRef.current?.close()}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M6 18 18 6" />
            </svg>
          </button>
          <p className="setup-step">One last check</p>
          <h2 id="confirmation-title">Confirm your choices.</h2>
          <p className="confirmation-description" id="confirmation-description">
            Review the sample details for each selected restaurant.
          </p>
          <div className="confirmation-restaurants">
            {restaurantsToConfirm.map((restaurant) => (
              <article key={restaurant.id} className="confirmation-card">
                <div className="confirmation-restaurant-heading">
                  {/* <RestaurantImage
                    name={restaurant.name}
                    photoUrl={restaurant.photoUrl}
                  /> */}
                  <div>
                    <h3>{restaurant.name}</h3>
                    <p>{restaurant.phone || "Phone unavailable"}</p>
                    {restaurant.isOpenNow === false && (
                      <p className="restaurant-closed">May be closed</p>
                    )}
                  </div>
                </div>
                <p className="confirmation-detail-label">Placeholder details</p>
                <dl className="confirmation-details">
                  <div>
                    <dt>Party size</dt>
                    <dd>4 people</dd>
                  </div>
                  <div>
                    <dt>Arrival</dt>
                    <dd>As soon as possible</dd>
                  </div>
                  <div>
                    <dt>Max wait</dt>
                    <dd>15 minutes</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <p className="restaurant-note">
            Sample details only. No calls or reservations are made.
          </p>
          <div className="confirmation-actions">
            <button
              type="button"
              onClick={() => confirmationRef.current?.close()}
            >
              Edit selections
            </button>
            <button
              type="button"
              className="confirmation-submit"
              disabled={restaurantsToConfirm.length === 0}
              onClick={() => {
                confirmationRef.current?.close();
                setStep(4);
              }}
            >
              Make call(s)
            </button>
          </div>
        </div>
      </dialog>
    </main>
  );
}
