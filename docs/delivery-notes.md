# CI repair and aggregator/mobile delivery

## Verified failure and repair

The [failed main CI run](https://github.com/eshwarsastry/ev-charging-platform-backend/actions/runs/36341528118) passed install, lint, typecheck, tests, audit and Nest build. Docker failed at `RUN corepack enable` with `/bin/sh: corepack: not found`. [Node stopped bundling Corepack in v25](https://nodejs.org/download/release/v25.8.0/docs/api/corepack.html).

The Dockerfile now uses Node 24 consistently with CI and installs the exact pnpm version declared in `packageManager`, without relying on bundled Corepack. Dependabot's Docker updates stay within the Node major until CI and runtime can be updated together. CI additionally starts the production image against PostGIS, exercises migrations/readiness, and checks discovery, validation, payment authorization and sandbox responses.

The startup smoke test also exposed a missing runtime dependency: Swagger's Fastify adapter requires `@fastify/static`. It is now a production dependency matching the adapter's peer range, and smoke checks verify the Swagger page and CSS. Nest's testing package is aligned with the backend's Nest 11 major.

The Render blueprint uses `/health/ready` and `autoDeployTrigger: checksPass`, per the [Render blueprint specification](https://render.com/docs/blueprint-spec). Apply/sync that blueprint to the Render service to adopt the deployment gate. No Render deployment or production database migration was performed during development.

## Connect more operators

Existing Pulse Energy and IONAGE environment variables remain supported. Add additional feeds without code changes:

```env
OCPI_PROVIDERS_JSON=[{"id":"your-operator","displayName":"Your Operator","enabled":true,"baseUrl":"https://operator.example/ocpi/cpo/2.2.1","token":"raw-credentials-token"}]
```

Each ID is unique; built-in IDs cannot be reused. URLs must be HTTPS. The base URL is the parent of the operator's Locations endpoint. Run `POST /v1/providers/:providerId/sync` with `x-admin-api-key` from a trusted server or operator tool. Schedule that protected endpoint in your infrastructure to refresh data. Vendor contracts with other endpoint shapes or protocols need a dedicated adapter; configuration alone does not implement them.

The OCPI client Base64-encodes raw credential tokens and follows same-origin `Link: rel="next"` pages, including pages below the requested limit. Repeated/cross-origin links and redirects are rejected to keep tokens on the configured host. Public discovery filters unpublished locations. [OCPI 2.2.1 transport specification](https://github.com/ocpi/ocpi/blob/2.2.1/transport_and_format.asciidoc).

This is pull-based discovery from contracted feeds, not guaranteed coverage of all vendors. Availability reflects the last import. Remaining production data work includes scheduled ingestion, removal/staleness reconciliation, credential negotiation, multi-party identity handling for roaming-hub feeds, tariffs and OCPI commands/CDRs.

## Payments and launch boundary

The user currently has no operator or bank API access. The acquiring-bank adapter therefore continues to fail closed with `FASTAG_PARTNER_ONBOARDING_REQUIRED`. Existing administrative payment operations and reads now require the admin guard; the mobile app cannot access them. The separate optional sandbox controller has access only to the mock gateway, never to the partner gateway or real tag inputs.

Production needs an approved NETC/acquirer contract and certificates, operator control agreements, authenticated customer sessions and ownership checks, trusted meter/CDR pricing, durable idempotent settlement with reconciliation/refunds and security review. The existing administrative mock orchestration is not a certified production payments service. See [NETC EV guidelines](https://ihmcl.co.in/wp-content/uploads/2025/12/NETC_PG_V2.1.pdf) and the existing FASTag onboarding document.

## Mobile

See [mobile setup and signing](../mobile/README.md). No partner secrets are bundled. Sample stations are explicitly fictional and are never returned as connected results. Android/iOS bundle verification does not replace device testing or signed release builds.

The mobile dependency audit identified vulnerable transitive `uuid` and `decode-uri-component` versions. Scoped overrides select patched versions. The one-line `query-string` patch adapts its CommonJS import to the new decoder's default export. `scripts/dependency-check.cjs` verifies encoded query parsing and Xcode UUID compatibility; mobile CI also audits the lockfile. Revisit these overrides when Expo adopts the fixes upstream.
