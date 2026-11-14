"use client";

import Script from "next/script";
import { useMemo, useState } from "react";
import restaurantData from "@/data/restaurants.json";

const { restaurants } = restaurantData;

const retellVoicePublicKey = process.env.NEXT_PUBLIC_RETELL_VOICE_PUBLIC_KEY;
const retellVoiceAgentId = process.env.NEXT_PUBLIC_RETELL_VOICE_AGENT_ID;
const hasRetellWebVoice = Boolean(retellVoicePublicKey && retellVoiceAgentId);

export default function Home() {
  const [step, setStep] = useState(1);
  const [distance, setDistance] = useState("5");
  const [customMiles, setCustomMiles] = useState("");
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);

  const isFinished = step > 2;
  const maxDistance = Number(distance === "custom" ? customMiles : distance);
  const filteredRestaurants = restaurants.filter(
    (restaurant) => restaurant.distance <= maxDistance,
  );
  const selectedRestaurantDetails = useMemo(
    () => restaurants.filter((restaurant) => selectedRestaurants.includes(restaurant.id)),
    [selectedRestaurants],
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
        ) : (
          <form
            className="setup-distance setup-restaurants"
            onSubmit={(event) => {
              event.preventDefault();
              if (selectedRestaurants.length === 0) return;
              setStep(3);
            }}
          >
            <span className="restaurant-label" id="restaurant-label">
              Restaurants within {maxDistance} miles
            </span>
            <div className="restaurant-list" role="group" aria-labelledby="restaurant-label">
              {filteredRestaurants.map((restaurant) => (
                <label className="restaurant-row" key={restaurant.id}>
                  <span className="restaurant-image" aria-hidden="true" />
                  <span className="restaurant-info">
                    <strong>{restaurant.name}</strong>
                    <span>
                      <span className="restaurant-rating">★ {restaurant.rating}</span> · {restaurant.cuisine}
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
                        checked ? [...current, restaurant.id] : current.filter((id) => id !== restaurant.id),
                      );
                    }}
                  />
                </label>
              ))}
              {filteredRestaurants.length === 0 && (
                <p className="restaurant-empty" role="status">
                  No restaurants within {maxDistance} miles. Try a larger distance.
                </p>
              )}
            </div>
            <p className="restaurant-note">Ratings and phone numbers are placeholders.</p>
            <button type="submit" disabled={selectedRestaurants.length === 0}>Continue</button>
            <button type="button" className="setup-back" onClick={() => setStep(1)}>
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

      {isFinished && (
        <section className="call-panel" aria-labelledby="call-title">
          <p className="setup-step">Availability assistant</p>
          <h1 id="call-title">Check before you go</h1>
          <p className="setup-description">
            Start a browser voice demo, then have a teammate answer as the restaurant. The AI only asks about wait time and cannot make a reservation or spend money.
          </p>

          <div className="call-list">
            <article className="call-card">
              <div>
                <h2>Browser voice demo</h2>
                <p>Allow microphone access, then say: “The current wait is 20 minutes.”</p>
              </div>
              {hasRetellWebVoice ? (
                <p className="call-status status-in-progress" role="status">
                  Click <strong>Start wait-time demo</strong> in the Retell panel at the bottom-right of the screen.
                </p>
              ) : (
                <p className="call-error" role="alert">
                  Add the Retell public key and voice-agent ID to enable the browser demo.
                </p>
              )}
            </article>
            {selectedRestaurantDetails.map((restaurant) => (
              <article className="call-card" key={restaurant.id}>
                <div>
                  <h2>{restaurant.name}</h2>
                  <p>{restaurant.cuisine}</p>
                </div>
                <p className="call-placeholder">Demo context only—no phone number is dialed.</p>
              </article>
            ))}
          </div>

          {hasRetellWebVoice && (
            <Script
              id="retell-web-voice"
              strategy="afterInteractive"
              type="module"
              src="https://dashboard.retellai.com/retell-widget-v2.js"
              data-voice-public-key={retellVoicePublicKey}
              data-voice-agent-id={retellVoiceAgentId}
              data-title="Restaurant wait-time demo"
              data-fab-text="Start wait-time demo"
              data-show-ai-popup="false"
            />
          )}

          <button type="button" className="setup-back" onClick={() => setStep(2)}>
            Change restaurants
          </button>
        </section>
      )}
    </main>
  );
}
