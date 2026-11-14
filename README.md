# CPVC Hackathon — Zero-Wait

Next.js with TypeScript, App Router, Tailwind CSS, and ESLint. The project contains
the `dev` branch's frontend setup wizard and a TomTom-backed restaurant API. The
backend does **not** place AI calls.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Add a TomTom API key as `TOMTOM_API_KEY`.
3. Run `npm install` and `npm run dev`.

Build with `npm run build`.

`MAX_ROUTE_CANDIDATES` controls the maximum number of restaurant candidates whose
routed distances are requested. It defaults to 40 to keep API use predictable.

## Frontend mock restaurant data

`src/data/restaurants.json` contains 100 restaurant entries and metadata describing
the mock fields and name sources. The page imports this file directly.

Each entry has `id`, `name`, `cuisine`, `rating`, `phone`, `distance`, `city`, and
`sourceUrl`. `distance` is a made-up number in **miles**, not calculated from a
location. Step one filters the list to restaurants whose `distance` is less than or
equal to the selected radius, including custom miles. Use **Change distance** to
adjust the radius; continuing from step one clears previous restaurant selections.
An empty result shows a message and keeps Continue disabled. Cuisines and ratings
are illustrative, phone numbers are fictional 555 numbers, and images remain blank
placeholders.

The original four restaurant names are preserved. Additional names come from
[Downtown SLO's restaurant directory](https://downtownslo.com/shop-and-dine/dining/restaurants),
[Pismo Beach's outdoor dining directory](https://experiencepismobeach.com/restaurants/outdoor-dining/),
and its [visitor guide](https://experiencepismobeach.com/wp-content/uploads/2024/04/Pismo_Visitor_Guide_2023_11_16_1a5a3391-589b-4a3f-a0b8-d358e7ad1b14.pdf).
This dataset is for a frontend demo, not a verified directory of currently operating
businesses.

## Backend API

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
