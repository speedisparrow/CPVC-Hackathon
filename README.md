# Zero-Wait restaurant backend

Next.js backend for discovering restaurants, deriving the available cuisine list,
filtering by travel distance and cuisine, and sorting wait-time results supplied by
a future calling service. This code does **not** place calls.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Add a TomTom API key as `TOMTOM_API_KEY`.
3. Run `npm run dev`.

`MAX_ROUTE_CANDIDATES` controls the maximum number of restaurant candidates whose
routed distances are requested. It defaults to 40 to keep API use predictable.

## API

All routes accept and return JSON.

### Discover nearby restaurants and cuisines

`POST /api/restaurants/discover`

```json
{
  "location": { "latitude": 34.0522, "longitude": -118.2437 },
  "maxTravelDistanceMiles": 10
}
```

Returns restaurants within the requested routed travel distance and a sorted,
deduplicated `cuisines` array derived from those restaurants.

### Filter by cuisine

`POST /api/restaurants/filter`

```json
{
  "location": { "latitude": 34.0522, "longitude": -118.2437 },
  "maxTravelDistanceMiles": 10,
  "cuisine": "Korean"
}
```

The response contains matching restaurants. Restaurants include phone numbers when
the provider has one so the UI can disable selection for places that cannot be
called.

### Sort wait times from the future calling service

`POST /api/restaurants/wait-times/sort`

```json
{
  "restaurants": [
    {
      "id": "restaurant-id",
      "name": "Example Restaurant",
      "address": "123 Main St",
      "location": { "latitude": 34.05, "longitude": -118.24 },
      "cuisines": ["Korean"],
      "phone": "+15555550123",
      "website": null,
      "distanceMiles": 1.99
    }
  ],
  "results": [
    {
      "restaurantId": "restaurant-id",
      "status": "answered",
      "waitMinutes": 10
    }
  ]
}
```

Every restaurant is returned. Restaurants with answered wait times are sorted from
shortest to longest wait. Restaurants whose calls failed, were unavailable, or do
not yet have a result remain in the response at the end with a `null` wait time.
There is no maximum-wait field and the backend does not store one.
