"use client";

import { useState } from "react";
import restaurantData from "@/data/restaurants.json";

const { restaurants } = restaurantData;
const cuisines = [
  ...new Set(restaurants.map((restaurant) => restaurant.cuisine)),
].sort((a, b) => a.localeCompare(b));

export default function Home() {
  const [step, setStep] = useState(1);
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
