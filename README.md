# CPVC Hackathon — Zero-Wait

Next.js with TypeScript, App Router, Tailwind CSS, and ESLint. The frontend setup
wizard gets the user's browser location and loads real restaurant results from the
TomTom-backed API. The backend does **not** place AI calls.

## Setup

1. Copy **.env.example** to **.env.local**.
2. Add a TomTom API key as **TOMTOM_API_KEY**.
3. Run **npm install** and **npm run dev**.

Build with **npm run build**.

**MAX_ROUTE_CANDIDATES** controls the maximum number of restaurant candidates whose
routed distances are requested. It defaults to 40 to keep API use predictable.

## Location access

The site requests browser location access when it opens. Coordinates remain in
React state and are sent to **POST /api/restaurants/discover** only after the user
selects a maximum distance. Geolocation requires HTTPS or a trusted local origin
such as **localhost**. Denied permission, unsupported browsers, unavailable
positions, and timeouts display an error with an option to try again.

## Frontend restaurant discovery

The wizard has three selection steps: distance, cuisine, and restaurant. The
distance and browser coordinates are sent to the discovery API. Available cuisines
are derived from the live response rather than a bundled JSON file. Users can select
multiple cuisines or leave all unchecked to see every returned restaurant. The
restaurant step displays provider-supplied names, routed distance, cuisines, and
phone availability.

Use **Change cuisine** to return to the cuisine step, then **Change distance** if
needed. Changing the distance performs a new discovery request and clears previous
cuisine and restaurant selections. No bundled mock restaurant dataset is used.

## Backend API

All routes accept and return JSON.

### Discover nearby restaurants and cuisines

**POST /api/restaurants/discover**

~~~json
{
  "location": { "latitude": 34.0522, "longitude": -118.2437 },
  "maxTravelDistanceMiles": 10
}
~~~

Returns restaurants within the requested routed travel distance and a sorted,
deduplicated **cuisines** array derived from those restaurants.

### Filter by cuisine

**POST /api/restaurants/filter**

~~~json
{
  "location": { "latitude": 34.0522, "longitude": -118.2437 },
  "maxTravelDistanceMiles": 10,
  "cuisine": "Korean"
}
~~~

The response contains matching restaurants. Restaurants include phone numbers when
the provider has one so the UI can disable selection for places that cannot be
called.

### Sort wait times from the future calling service

**POST /api/restaurants/wait-times/sort**

~~~json
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
~~~

Every restaurant is returned. Restaurants with answered wait times are sorted from
shortest to longest wait. Restaurants whose calls failed, were unavailable, or do
not yet have a result remain in the response at the end with a **null** wait time.
There is no maximum-wait field and the backend does not store one.
