# Architecture

OHMCharge starts as a modular monolith. It keeps transactional consistency and deployment cost low while preserving module boundaries that can later become services.

## Request flow

1. `GoogleRoutesClient` obtains the road route, duration, distance and GeoJSON polyline from Google Routes API.
2. PostGIS finds compatible chargers inside the configured route corridor and calculates their progress along the route.
3. `TripPlannerService` applies the vehicle battery model and chooses reachable live chargers.
4. Google Routes recalculates the final route with the selected chargers as intermediate waypoints.
5. Provider data is synchronized through credential-gated OCPI 2.2.1 adapters.
6. NETC EV payment orchestration first verifies the physical FASTag through an acquirer/Mapper gateway, then debits the final post-session amount after metering. The PoC runs with a deterministic mock; a real acquirer adapter is activated only after formal onboarding.
7. Charger control and payment are separate planes: OCPI/OCPP/private CPO integration controls the EVSE; FASTag replaces the vendor wallet rather than bypassing charger ownership.

## Trust boundaries

- Google, CPO and payment credentials exist only as deployment secrets.
- Provider payloads are retained in `stations.raw` for traceability, but API clients receive normalized fields.
- Admin sync endpoints require a separate high-entropy API key.
- Payment creation requires an idempotency key and persists intent state before contacting a gateway.
- Raw FASTag Tag IDs/TIDs are not persisted by the current flow; only a SHA-256 fingerprint is stored for continuity checks. No PIN, bank credential or Google key is stored in source control.

## Scaling path

- Add Redis/BullMQ when synchronization becomes asynchronous or exceeds one process.
- Move provider synchronization into a worker without changing normalized database contracts.
- Add read replicas/cache for high-volume map queries.
- Replace Render with Cloud Run or ECS using the same image.
- Partition live status from static station metadata only when update volume warrants it.
