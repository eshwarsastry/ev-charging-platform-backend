# Integration setup

## Google Maps Platform

Enable **Routes API** in a Google Cloud project, attach billing and create a server-side API key. Restrict the key to Routes API and to the production service's egress addresses when the hosting plan provides stable addresses.

The backend uses:

- `directions/v2:computeRoutes` for route distance, duration and GeoJSON polyline.
- `distanceMatrix/v2:computeRouteMatrix` for future detour ranking.
- PostGIS, rather than Google Places, as the source of contracted CPO inventory.

The key is provided as `GOOGLE_MAPS_API_KEY`. Never expose this server key to a mobile or browser client.

References:

- <https://developers.google.com/maps/documentation/routes/compute_route_directions>
- <https://developers.google.com/maps/documentation/routes/compute_route_matrix>

## Pulse Energy live data

Pulse Energy advertises real-time availability, remote start/stop, OCPI roaming, webhooks and sandbox access. Request API access at:

- <https://pulseenergy.io/ev-charging-api>

Ask specifically for:

1. eMSP/aggregator sandbox access.
2. OCPI 2.2.1 credentials endpoint or a versioned REST base URL.
3. Token format, IP allow-listing and rate limits.
4. Locations, Tariffs, Commands, Sessions and CDR modules.
5. Webhook signing and retry contract.
6. Commercial terms for production charger data and session initiation.

Configure `PULSE_ENERGY_OCPI_BASE_URL`, `PULSE_ENERGY_OCPI_TOKEN`, then set `PULSE_ENERGY_ENABLED=true`.

## IONAGE live data

IONAGE advertises an OCPI 2.2.1 Discovery API with Token A authorization, locations, dynamic EVSE status and tariffs:

- <https://www.ionage.in/products/developer-tools>

Request their eMSP/aggregator sandbox, Token A, credentials/version URL and production agreement. Configure `IONAGE_OCPI_BASE_URL`, `IONAGE_OCPI_TOKEN`, then set `IONAGE_ENABLED=true`.

## Synchronization

After credentials are configured:

```bash
curl -X POST "$API_URL/v1/providers/pulse-energy/sync" \
  -H "x-admin-api-key: $ADMIN_API_KEY"

curl -X POST "$API_URL/v1/providers/ionage/sync" \
  -H "x-admin-api-key: $ADMIN_API_KEY"
```

The repository includes live protocol adapters and contract tests, but it intentionally contains no scraped or reverse-engineered private endpoint.
