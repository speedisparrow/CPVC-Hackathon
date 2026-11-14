"use client";

import { useEffect, useMemo, useState } from "react";
import restaurantData from "@/data/restaurants.json";

const { restaurants } = restaurantData;

type Restaurant = (typeof restaurants)[number];
type CallStatus =
  | "queued"
  | "ringing"
  | "in-progress"
  | "completed"
  | "busy"
  | "failed"
  | "no-answer"
  | "canceled";

type CallResult = {
  availability: "available" | "waitlist" | "unavailable" | "unknown";
  waitMinutes: number | null;
  notes: string;
  needsHumanConfirmation: true;
};

type Call = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  status: CallStatus;
  result: CallResult | null;
  error: string | null;
  updatedAt: number;
};

const terminalStatuses = new Set<CallStatus>([
  "completed",
  "busy",
  "failed",
  "no-answer",
  "canceled",
]);

function isPlaceholderPhoneNumber(phoneNumber: string) {
  return phoneNumber.includes("555-");
}

function statusText(status: CallStatus) {
  const labels: Record<CallStatus, string> = {
    queued: "Preparing call",
    ringing: "Calling restaurant",
    "in-progress": "AI is speaking with the restaurant",
    completed: "Call finished",
    busy: "Restaurant line is busy",
    failed: "Call failed",
    "no-answer": "No answer",
    canceled: "Call canceled",
  };
  return labels[status];
}

export default function Home() {
  const [step, setStep] = useState(1);
  const [distance, setDistance] = useState("5");
  const [customMiles, setCustomMiles] = useState("");
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);
  const [partySize, setPartySize] = useState(3);
  const [requestedTime, setRequestedTime] = useState("18:30");
  const [callAuthorized, setCallAuthorized] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [calls, setCalls] = useState<Record<string, Call>>({});
  const [callError, setCallError] = useState<string | null>(null);

  const isFinished = step > 2;
  const maxDistance = Number(distance === "custom" ? customMiles : distance);
  const filteredRestaurants = restaurants.filter(
    (restaurant) => restaurant.distance <= maxDistance,
  );
  const selectedRestaurantDetails = useMemo(
    () => restaurants.filter((restaurant) => selectedRestaurants.includes(restaurant.id)),
    [selectedRestaurants],
  );

  useEffect(() => {
    if (!activeCallId) return;

    let stopped = false;
    const refreshCall = async () => {
      try {
        const response = await fetch(`/api/calls/${activeCallId}`, { cache: "no-store" });
        const data = (await response.json()) as { call?: Call };
        if (stopped || !data.call) return;
        setCalls((current) => ({ ...current, [data.call!.restaurantId]: data.call! }));
        if (terminalStatuses.has(data.call.status)) setActiveCallId(null);
      } catch {
        // The next poll will retry. Network state should not erase the existing result.
      }
    };

    void refreshCall();
    const interval = window.setInterval(() => void refreshCall(), 2500);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [activeCallId]);

  async function startCall(restaurant: Restaurant) {
    setCallError(null);
    if (isPlaceholderPhoneNumber(restaurant.phone)) {
      setCallError("This restaurant has a fictional placeholder number. Add a real business number before calling.");
      return;
    }

    try {
      const response = await fetch("/api/calls/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          phoneNumber: restaurant.phone,
          partySize,
          requestedTime: requestedTime || "as soon as possible",
        }),
      });
      const data = (await response.json()) as { call?: Call; error?: string };
      if (!response.ok || !data.call) throw new Error(data.error || "Unable to start the call.");
      setCalls((current) => ({ ...current, [restaurant.id]: data.call! }));
      setActiveCallId(data.call.id);
    } catch (error) {
      setCallError(error instanceof Error ? error.message : "Unable to start the call.");
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
              if (selectedRestaurants.length > 0) setStep(3);
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
            The AI calls only after you approve. It checks availability and wait time—it cannot make a reservation or spend money.
          </p>

          <div className="call-details">
            <label htmlFor="party-size">Party size</label>
            <input
              id="party-size"
              type="number"
              min="1"
              max="20"
              value={partySize}
              onChange={(event) => setPartySize(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}
            />
            <label htmlFor="requested-time">Desired time</label>
            <input
              id="requested-time"
              type="time"
              value={requestedTime}
              onChange={(event) => setRequestedTime(event.target.value)}
            />
          </div>

          <label className="call-consent">
            <input
              type="checkbox"
              checked={callAuthorized}
              onChange={(event) => setCallAuthorized(event.target.checked)}
            />
            <span>I authorize an AI availability call for this plan.</span>
          </label>

          {callError && <p className="call-error" role="alert">{callError}</p>}

          <div className="call-list">
            {selectedRestaurantDetails.map((restaurant) => {
              const call = calls[restaurant.id];
              const placeholderNumber = isPlaceholderPhoneNumber(restaurant.phone);
              const callInProgress = Boolean(activeCallId) && !terminalStatuses.has(call?.status ?? "completed");
              return (
                <article className="call-card" key={restaurant.id}>
                  <div>
                    <h2>{restaurant.name}</h2>
                    <p>{restaurant.cuisine} · {restaurant.phone}</p>
                  </div>
                  {placeholderNumber && (
                    <p className="call-placeholder">Add a real business phone number to enable calls.</p>
                  )}
                  {call && (
                    <div className={`call-status status-${call.status}`} role="status">
                      <strong>{statusText(call.status)}</strong>
                      {call.result && (
                        <p>
                          {call.result.availability === "available" ? "Availability confirmed" : call.result.availability === "waitlist" ? "Waitlist / wait time" : call.result.availability === "unavailable" ? "Unavailable" : "Could not confirm"}
                          {call.result.waitMinutes !== null ? ` · ${call.result.waitMinutes}-minute wait` : ""}
                          {call.result.notes ? ` — ${call.result.notes}` : ""}
                        </p>
                      )}
                      {call.error && <p>{call.error}</p>}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => void startCall(restaurant)}
                    disabled={!callAuthorized || placeholderNumber || callInProgress}
                  >
                    {callInProgress ? "Call in progress" : call ? "Check again" : "Check availability"}
                  </button>
                </article>
              );
            })}
          </div>

          <button type="button" className="setup-back" onClick={() => setStep(2)}>
            Change restaurants
          </button>
        </section>
      )}
    </main>
  );
}
