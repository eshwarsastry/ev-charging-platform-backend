CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE connector_status AS ENUM (
  'AVAILABLE', 'CHARGING', 'OCCUPIED', 'RESERVED',
  'OUTOFORDER', 'INOPERATIVE', 'UNKNOWN'
);
CREATE TYPE payment_status AS ENUM (
  'CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELLED', 'REFUNDED'
);

CREATE TABLE providers (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO providers (id, display_name) VALUES
  ('pulse-energy', 'Pulse Energy'),
  ('ionage', 'IONAGE'),
  ('seed', 'OHMCharge Seed Data')
ON CONFLICT DO NOTHING;

CREATE TABLE stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id text NOT NULL REFERENCES providers(id),
  external_id text NOT NULL,
  name text NOT NULL,
  address text,
  city text,
  state text,
  postal_code text,
  country_code text NOT NULL DEFAULT 'IND',
  location geometry(Point, 4326) NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  raw jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX stations_provider_external_uidx ON stations(provider_id, external_id);
CREATE INDEX stations_location_gix ON stations USING gist(location);

CREATE TABLE evses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  external_uid text NOT NULL,
  status connector_status NOT NULL DEFAULT 'UNKNOWN',
  floor_level text,
  last_updated timestamptz,
  UNIQUE(station_id, external_uid)
);

CREATE TABLE connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evse_id uuid NOT NULL REFERENCES evses(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  standard text NOT NULL,
  format text,
  power_type text,
  max_voltage integer,
  max_amperage integer,
  max_electric_power_watts integer,
  tariff_ids text[],
  last_updated timestamptz,
  UNIQUE(evse_id, external_id)
);

CREATE TABLE payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  vehicle_registration text NOT NULL,
  session_reference text NOT NULL,
  amount_paise bigint NOT NULL CHECK (amount_paise > 0),
  currency text NOT NULL DEFAULT 'INR',
  gateway text NOT NULL,
  gateway_reference text,
  status payment_status NOT NULL DEFAULT 'CREATED',
  failure_reason text,
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE provider_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id text NOT NULL REFERENCES providers(id),
  imported_locations integer NOT NULL DEFAULT 0,
  status text NOT NULL,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE TABLE vehicle_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  make text NOT NULL,
  model text NOT NULL,
  battery_capacity_kwh numeric(7,2) NOT NULL,
  efficiency_wh_per_km integer NOT NULL,
  usable_battery_percent integer NOT NULL DEFAULT 95,
  connector_standards text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO vehicle_profiles (
  make, model, battery_capacity_kwh, efficiency_wh_per_km,
  usable_battery_percent, connector_standards
) VALUES ('Tata', 'Nexon EV Max', 40.5, 150, 95, ARRAY['IEC_62196_T2_COMBO']);
