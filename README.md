# OHMCharge Backend

Node.js/TypeScript backend for Indian EV charger aggregation, live availability, Google Maps trip planning and payment orchestration.

## What is implemented

- NestJS + Fastify modular API
- PostgreSQL/PostGIS station storage and corridor/nearby search
- Google Routes API trip routing
- Battery-aware charging-stop selection
- OCPI 2.2.1 live-data adapters for Pulse Energy and IONAGE
- NETC EV FASTag identification + post-session settlement with a safe PoC mock gateway
- Swagger/OpenAPI at `/docs`
- Structured logs, security headers, rate limiting and health probes
- Docker, Render Blueprint and GitHub Actions CI
- Android/iOS Expo app in [`mobile`](mobile/README.md), with a web preview
- Configurable additional OCPI operators and an opt-in public FASTag demonstration

Partner credentials are not included. Pulse Energy, IONAGE and production NETC/FASTag access require their respective commercial and sandbox onboarding.

## Local setup

Requirements: Node.js 24+, pnpm 10+ and Docker.

```bash
cp .env.example .env
docker compose up -d postgres
pnpm install
pnpm db:migrate
pnpm start:dev
```

Replace the example secrets before starting. A Google Routes key is only needed for trip planning; discovery and the payment sandbox can run without it. The API is available at `http://localhost:3000`; Swagger is at `http://localhost:3000/docs`.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
docker build -t ohmcharge-api .
```

## Example trip request

```bash
curl -X POST http://localhost:3000/v1/trips/plan \
  -H 'content-type: application/json' \
  -d '{
    "origin":{"latitude":12.9716,"longitude":77.5946},
    "destination":{"latitude":11.6643,"longitude":78.1460},
    "vehicle":{
      "batteryCapacityKwh":40.5,
      "efficiencyWhPerKm":150,
      "startingSocPercent":80,
      "reserveSocPercent":10,
      "targetChargeSocPercent":80,
      "connectorStandards":["IEC_62196_T2_COMBO"]
    },
    "preferences":{"minimumPowerKw":30,"corridorMeters":8000}
  }'
```

## Deployment

1. Create a free Supabase project and enable PostGIS.
2. Create a Render Blueprint from this repository using `render.yaml`.
3. Add `DATABASE_URL`, `GOOGLE_MAPS_API_KEY` and `CORS_ORIGINS` in Render.
4. Leave provider integrations disabled until sandbox credentials are issued.
5. Keep `FASTAG_MODE=mock` until NETC/acquirer certification is complete. The app can bypass CPO wallets only where the charger owner also grants an OCPI/OCPP/private control integration.

Render free services sleep when idle, so this deployment is intended for a PoC rather than an uptime-sensitive launch.

## Documentation

- [Architecture](docs/architecture.md)
- [Google Maps and live CPO integrations](docs/integrations.md)
- [FASTag/NETC onboarding](docs/fastag-onboarding.md)
- [CI repair, provider configuration and launch requirements](docs/delivery-notes.md)
- [Android/iOS application](mobile/README.md)

## License

Apache-2.0
