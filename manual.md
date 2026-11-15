### Discover nearby restaurants and cuisines

**POST /api/restaurants/discover**

```json
{
  "location": { "latitude": 34.0522, "longitude": -118.2437 },
  "maxTravelDistanceMiles": 10
}
```

Returns restaurants within the requested routed travel distance and a sorted,
deduplicated **cuisines** array derived from those restaurants.

### Filter by cuisine

**POST /api/restaurants/filter**

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

**POST /api/restaurants/wait-times/sort**

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
not yet have a result remain in the response at the end with a **null** wait time.
There is no maximum-wait field and the backend does not store one.

## Demo fallback [CURRENT VERSION]
When TOMTOM_API_KEY is missing or blank, discovery and cuisine filtering use src/data/restaurants.json without external API requests. No environment variables are required for demo data. Fixture distances and phone numbers are fictional; distance filtering uses the stored distances, independently of browser location. The UI labels these results as demo data. Browser location permission is still required by the setup wizard. With a key configured, TomTom remains the provider; provider failures do not silently switch to demo data. 