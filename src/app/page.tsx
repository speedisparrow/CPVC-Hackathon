"use client";

import { useRef, useState } from "react";
import restaurantData from "@/data/restaurants.json";

const { restaurants } = restaurantData;
const cuisines = [
  ...new Set(restaurants.map((restaurant) => restaurant.cuisine)),
].sort((a, b) => a.localeCompare(b));

export default function Home() {
  const [step, setStep] = useState(0);
  const [startingLocation, setStartingLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const locationRequest = useRef(0);
  const [distance, setDistance] = useState("5");
  const [customMiles, setCustomMiles] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);
  const isFinished = step > 3;
  const maxDistance = Number(distance === "custom" ? customMiles : distance);
  const filteredRestaurants = restaurants.filter(
    (restaurant) =>
      restaurant.distance <= maxDistance &&
      (selectedCuisines.length === 0 ||
        selectedCuisines.includes(restaurant.cuisine)),
  );

  function requestLocation() {
    setLocationError("");

    if (!window.isSecureContext) {
      setLocationError(
        "Location access isn’t available on this connection. You can continue without it.",
      );
      return;
    }

    if (!navigator.geolocation) {
      setLocationError(
        "Your browser doesn’t support location access. You can continue without it.",
      );
      return;
    }

    const requestId = ++locationRequest.current;
    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (requestId !== locationRequest.current) return;
        setStartingLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsLocating(false);
        setStep(1);
      },
      (error) => {
        if (requestId !== locationRequest.current) return;
        setIsLocating(false);
        if (error.code === 1) {
          setLocationError(
            "Location access was denied. Allow it in your browser’s site settings, or continue without it.",
          );
        } else if (error.code === 3) {
          setLocationError(
            "Finding your location took too long. Try again, or continue without it.",
          );
        } else {
          setLocationError(
            "Your location couldn’t be found. Try again, or continue without it.",
          );
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  if (step === 0) {
    return (
      <main className="setup-screen">
        <section className="setup-wizard" aria-labelledby="location-title">
          <p className="setup-step">Before we start</p>
          <h1 id="location-title">Where are you starting from?</h1>
          <p className="setup-description">
            Share your location to set your starting point.
          </p>
          <div className="setup-distance location-actions">
            <button
              type="button"
              onClick={requestLocation}
              disabled={isLocating}
              aria-busy={isLocating}
              aria-describedby="location-note"
            >
              {isLocating ? "Finding your location…" : "Use my location"}
            </button>
            {locationError && (
              <p className="location-error" role="alert">
                {locationError}
              </p>
            )}
            <button
              type="button"
              className="setup-back"
              onClick={() => {
                locationRequest.current += 1;
                setIsLocating(false);
                setStep(1);
              }}
            >
              Continue without location
            </button>
            <p className="restaurant-note" id="location-note">
              Your location stays in this session. Restaurant distances are
              sample values for now.
            </p>
          </div>
        </section>
      </main>
    );
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
            onSubmit={(event) => {
              event.preventDefault();
              if (!Number.isFinite(maxDistance) || maxDistance <= 0) return;
              setSelectedRestaurants([]);
              setStep(2);
            }}
          >
            {startingLocation && (
              <p className="restaurant-note">Using your current location.</p>
            )}
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
                  step="any"
                  placeholder="Enter miles"
                  value={customMiles}
                  onChange={(event) => setCustomMiles(event.target.value)}
                  required
                />
              </div>
            )}
            <button type="submit">Continue</button>
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
                  <span className="cuisine-image" aria-hidden="true" />
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
              if (selectedRestaurants.length > 0) setStep(4);
            }}
          >
            <span className="restaurant-label" id="restaurant-label">
              {selectedCuisines.length === 0
                ? "All cuisines"
                : selectedCuisines.length === 1
                  ? selectedCuisines[0]
                  : `${selectedCuisines.length} cuisines`}{" "}
              · Within {maxDistance} miles
            </span>
            <div
              className="restaurant-list"
              role="group"
              aria-labelledby="restaurant-label"
            >
              {filteredRestaurants.map((restaurant) => (
                <label className="restaurant-row" key={restaurant.id}>
                  <span className="restaurant-image" aria-hidden="true" />
                  <span className="restaurant-info">
                    <strong>{restaurant.name}</strong>
                    <span>
                      <span className="restaurant-rating">
                        ★ {restaurant.rating}
                      </span>{" "}
                      · {restaurant.cuisine}
                    </span>
                    <span className="restaurant-phone">{restaurant.phone}</span>
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
            <p className="restaurant-note">
              Ratings and phone numbers are placeholders.
            </p>
            <button
              type="submit"
              disabled={selectedRestaurants.length === 0 || isFinished}
            >
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
    </main>
  );
}
