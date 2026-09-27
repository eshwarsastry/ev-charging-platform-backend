CREATE TYPE fastag_session_status AS ENUM (
  'TAG_VERIFIED', 'REJECTED', 'SETTLING', 'PAID', 'FAILED', 'CANCELLED'
);

CREATE TABLE fastag_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lookup_key text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  station_reference text NOT NULL,
  tag_fingerprint text NOT NULL,
  vehicle_registration text,
  vehicle_class text,
  issuer_bank_id text,
  exception_code text,
  tag_status text NOT NULL,
  status fastag_session_status NOT NULL,
  payment_intent_id uuid,
  energy_wh bigint,
  amount_paise bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fastag_sessions_station_reference_idx ON fastag_sessions(station_reference);
