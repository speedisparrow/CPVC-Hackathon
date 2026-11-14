export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  location: Coordinates;
  cuisines: string[];
  phone: string | null;
  website: string | null;
  distanceMiles: number;
};

export type RestaurantSearchInput = {
  location: Coordinates;
  maxTravelDistanceMiles: number;
  cuisine?: string;
};

export type WaitTimeResult = {
  restaurantId: string;
  waitMinutes: number | null;
  status: "answered" | "unavailable" | "failed";
};

