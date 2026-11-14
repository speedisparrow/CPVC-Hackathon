"use client";

import { useMemo, useRef, useState } from "react";
import { RetellClient, type WebCallSession } from "retell-client-js-sdk";
import restaurantData from "@/data/restaurants.json";

const { restaurants } = restaurantData;

const retellVoicePublicKey = process.env.NEXT_PUBLIC_RETELL_VOICE_PUBLIC_KEY;
const retellVoiceAgentId = process.env.NEXT_PUBLIC_RETELL_VOICE_AGENT_ID;
const hasRetellWebVoice = Boolean(retellVoicePublicKey && retellVoiceAgentId);

type VoiceCallStatus = "ready" | "connecting" | "live" | "ended" | "error";

export default function Home() {
  const [step, setStep] = useState(1);
  const [distance, setDistance] = useState("5");
  const [customMiles, setCustomMiles] = useState("");
  const [selectedRestaurants, setSelectedRestaurants] = useState<string[]>([]);
  const [voiceCallStatus, setVoiceCallStatus] = useState<VoiceCallStatus>("ready");
  const [isMuted, setIsMuted] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const activeCall = useRef<WebCallSession | null>(null);
  const voiceCallFailed = useRef(false);

  const isFinished = step > 2;
  const maxDistance = Number(distance === "custom" ? customMiles : distance);
  const filteredRestaurants = restaurants.filter(
    (restaurant) => restaurant.distance <= maxDistance,
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
