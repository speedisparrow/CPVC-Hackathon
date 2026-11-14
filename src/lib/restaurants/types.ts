export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type OpeningHours = {
  mode: "nextSevenDays";
  timeRanges: {
    startTime: { date: string; hour: number; minute: number };
    endTime: { date: string; hour: number; minute: number };
  }[];
};

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  location: Coordinates;
  cuisines: string[];
  phone: string | null;
  website: string | null;
  photoUrl: string | null;
  distanceMiles: number;
  openingHours: OpeningHours | null;
  openingHoursSourceUrl: string | null;
  timeZone: string | null;
  isOpenNow: boolean | null;
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
