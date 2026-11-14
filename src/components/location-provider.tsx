"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Coordinates } from "@/lib/restaurants/types";

type LocationStatus =
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable"
  | "error";

type LocationContextValue = {
  location: Coordinates | null;
  status: LocationStatus;
  error: string | null;
  requestLocation: () => void;
};

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<LocationStatus>("requesting");
  const [error, setError] = useState<string | null>(null);
  const requestedOnLoad = useRef(false);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      setError("Location is not supported by this browser.");
      return;
    }

    setStatus("requesting");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setStatus("granted");
      },
      (locationError) => {
        setLocation(null);
        setStatus(
          locationError.code === locationError.PERMISSION_DENIED
            ? "denied"
            : "error",
        );
        setError(locationError.message || "Unable to determine your location.");
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 5 * 60_000,
      },
    );
  }, []);

  useEffect(() => {
    if (requestedOnLoad.current) return;
    requestedOnLoad.current = true;
    requestLocation();
  }, [requestLocation]);

  const value = useMemo(
    () => ({ location, status, error, requestLocation }),
    [location, status, error, requestLocation],
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useUserLocation(): LocationContextValue {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useUserLocation must be used inside LocationProvider");
  }
  return context;
}

