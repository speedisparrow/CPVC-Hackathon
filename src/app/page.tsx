"use client";

import { useMemo, useRef, useState } from "react";
import { RetellClient, type WebCallSession } from "retell-client-js-sdk";
import restaurantData from "@/data/restaurants.json";

type DiscoverResponse = {
  restaurants: Restaurant[];
  cuisines: string[];
  error?: string;
};

const retellVoicePublicKey = process.env.NEXT_PUBLIC_RETELL_VOICE_PUBLIC_KEY;
const retellVoiceAgentId = process.env.NEXT_PUBLIC_RETELL_VOICE_AGENT_ID;
const hasRetellWebVoice = Boolean(retellVoicePublicKey && retellVoiceAgentId);

type VoiceCallStatus = "ready" | "connecting" | "live" | "ended" | "error";

export default function Home() {
  const [step, setStep] = useState(0);
  const [distance, setDistance] = useState("5");
  const [customMiles, setCustomMiles] = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);
  const [voiceCallStatus, setVoiceCallStatus] = useState<VoiceCallStatus>("ready");
  const [isMuted, setIsMuted] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const activeCall = useRef<WebCallSession | null>(null);
  const voiceCallFailed = useRef(false);

  const isFinished = step > 2;
  const maxDistance = Number(distance === "custom" ? customMiles : distance);
  const filteredRestaurants = restaurants.filter(
    (restaurant) =>
      selectedCuisines.length === 0 ||
      restaurant.cuisines.some((cuisine) => selectedCuisines.includes(cuisine)),
  );
  const restaurantsToConfirm = filteredRestaurants.filter((restaurant) =>
    selectedRestaurants.includes(restaurant.id),
  );
  const selectedRestaurantDetails = useMemo(
    () => restaurants.filter((restaurant) => selectedRestaurants.includes(restaurant.id)),
    [selectedRestaurants],
  );

  const endVoiceCall = async () => {
    const call = activeCall.current;
    if (!call) return;

    try {
      await call.end();
    } catch {
      // The call may already have been ended by the agent or connection.
    } finally {
      activeCall.current = null;
      voiceCallFailed.current = false;
      setIsMuted(false);
      setVoiceCallStatus("ended");
    }
  };

  const startVoiceCall = () => {
    if (!retellVoicePublicKey || !retellVoiceAgentId) {
      setVoiceError("Add the Retell public key and voice-agent ID, then restart the app or redeploy.");
      setVoiceCallStatus("error");
      return;
    }

    if (activeCall.current && activeCall.current.status !== "ended") return;

    setVoiceError("");
    setIsMuted(false);
    voiceCallFailed.current = false;
    setVoiceCallStatus("connecting");

    const client = new RetellClient({ key: retellVoicePublicKey });
    const call = client.createWebCall({
      agent_id: retellVoiceAgentId,
      metadata: {
        selected_restaurants: selectedRestaurantDetails.map((restaurant) => restaurant.name),
      },
      hooks: {
        onStatus: (status) => {
          if (status === "live") setVoiceCallStatus("live");
          if (status === "ended") {
            activeCall.current = null;
            setIsMuted(false);
            if (!voiceCallFailed.current) setVoiceCallStatus("ended");
          }
        },
        onEnd: () => {
          activeCall.current = null;
          setIsMuted(false);
          if (!voiceCallFailed.current) setVoiceCallStatus("ended");
        },
        onError: (error) => {
          activeCall.current = null;
          voiceCallFailed.current = true;
          setIsMuted(false);
          setVoiceError(error.message || "The browser call could not start. Check your microphone and Retell key settings.");
          setVoiceCallStatus("error");
        },
      },
    });

    activeCall.current = call;
  };

  const toggleMute = () => {
    const call = activeCall.current;
    if (!call || voiceCallStatus !== "live") return;

    if (isMuted) {
      call.unmute();
    } else {
      call.mute();
    }
    setIsMuted((muted) => !muted);
  };

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
              if (selectedRestaurants.length === 0) return;
              setStep(3);
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
            <div className="restaurant-list" role="group" aria-labelledby="restaurant-label">
              {filteredRestaurants.map((restaurant) => (
                <label className="restaurant-row" key={restaurant.id}>
                  {/* <RestaurantImage
                    name={restaurant.name}
                    photoUrl={restaurant.photoUrl}
                  /> */}
                  <span className="restaurant-info">
                    <strong>{restaurant.name}</strong>
                    <span>
                      <span className="restaurant-rating">★ {restaurant.rating}</span> · {restaurant.cuisine}
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
          {[1, 2, 3].map((number) => (
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
            <article className="call-card voice-demo-card">
              <div className="voice-demo-copy">
                <p className="voice-demo-eyebrow">Live browser demo</p>
                <h2>Ask the AI for the current wait</h2>
                <p>Click start, allow microphone access, then have a teammate answer as the restaurant.</p>
              </div>

              <div className="voice-demo-actions">
                <button
                  type="button"
                  className="voice-primary-action"
                  onClick={startVoiceCall}
                  disabled={voiceCallStatus === "connecting" || voiceCallStatus === "live"}
                >
                  <span aria-hidden="true">●</span>
                  {voiceCallStatus === "connecting" ? "Connecting…" : "Start wait-time demo"}
                </button>

                {voiceCallStatus === "live" && (
                  <div className="voice-call-controls" aria-label="Call controls">
                    <button type="button" className="voice-secondary-action" onClick={toggleMute}>
                      {isMuted ? "Unmute microphone" : "Mute microphone"}
                    </button>
                    <button type="button" className="voice-end-action" onClick={endVoiceCall}>
                      End call
                    </button>
                  </div>
                )}
              </div>

              {voiceCallStatus === "ready" && hasRetellWebVoice && (
                <p className="call-status" role="status">Ready when you are. No phone number is dialed.</p>
              )}
              {voiceCallStatus === "connecting" && (
                <p className="call-status status-in-progress" role="status">Connecting to the AI and requesting microphone access…</p>
              )}
              {voiceCallStatus === "live" && (
                <p className="call-status status-live" role="status">Live now. Say: “The current wait is 20 minutes.”</p>
              )}
              {(!hasRetellWebVoice || voiceCallStatus === "error") && (
                <p className="call-error" role="alert">
                  {voiceError || "Add the Retell public key and voice-agent ID to enable the browser demo."}
                </p>
              )}
              {voiceCallStatus === "ended" && (
                <p className="call-status" role="status">Call ended. You can start another demo whenever you want.</p>
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

          <button type="button" className="setup-back" onClick={() => setStep(2)}>
            Change restaurants
          </button>
        </section>
      )}
    </main>
  );
}
