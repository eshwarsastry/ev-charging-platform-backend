import {
  bigint,
  boolean,
  geometry,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const connectorStatus = pgEnum('connector_status', [
  'AVAILABLE',
  'CHARGING',
  'OCCUPIED',
  'RESERVED',
  'OUTOFORDER',
  'INOPERATIVE',
  'UNKNOWN',
]);

export const paymentStatus = pgEnum('payment_status', [
  'CREATED',
  'AUTHORIZED',
  'CAPTURED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
]);

export const fastagSessionStatus = pgEnum('fastag_session_status', [
  'TAG_VERIFIED',
  'REJECTED',
  'SETTLING',
  'PAID',
  'FAILED',
  'CANCELLED',
]);

export const providers = pgTable('providers', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  enabled: boolean('enabled').notNull().default(false),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const stations = pgTable(
  'stations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    providerId: text('provider_id')
      .notNull()
      .references(() => providers.id),
    externalId: text('external_id').notNull(),
    name: text('name').notNull(),
    address: text('address'),
    city: text('city'),
    state: text('state'),
    postalCode: text('postal_code'),
    countryCode: text('country_code').notNull().default('IND'),
    location: geometry('location', { type: 'point', mode: 'xy', srid: 4326 }).notNull(),
    isPublic: boolean('is_public').notNull().default(true),
    raw: jsonb('raw').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('stations_provider_external_uidx').on(table.providerId, table.externalId),
    index('stations_location_gix').using('gist', table.location),
  ],
);

export const evses = pgTable(
  'evses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stationId: uuid('station_id')
      .notNull()
      .references(() => stations.id, { onDelete: 'cascade' }),
    externalUid: text('external_uid').notNull(),
    status: connectorStatus('status').notNull().default('UNKNOWN'),
    floorLevel: text('floor_level'),
    lastUpdated: timestamp('last_updated', { withTimezone: true }),
  },
  (table) => [uniqueIndex('evses_station_external_uidx').on(table.stationId, table.externalUid)],
);

export const connectors = pgTable(
  'connectors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    evseId: uuid('evse_id')
      .notNull()
      .references(() => evses.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    standard: text('standard').notNull(),
    format: text('format'),
    powerType: text('power_type'),
    maxVoltage: integer('max_voltage'),
    maxAmperage: integer('max_amperage'),
    maxElectricPowerWatts: integer('max_electric_power_watts'),
    tariffIds: text('tariff_ids').array(),
    lastUpdated: timestamp('last_updated', { withTimezone: true }),
  },
  (table) => [uniqueIndex('connectors_evse_external_uidx').on(table.evseId, table.externalId)],
);

export const fastagSessions = pgTable(
  'fastag_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lookupKey: text('lookup_key').notNull(),
    userId: uuid('user_id').notNull(),
    stationReference: text('station_reference').notNull(),
    tagFingerprint: text('tag_fingerprint').notNull(),
    vehicleRegistration: text('vehicle_registration'),
    vehicleClass: text('vehicle_class'),
    issuerBankId: text('issuer_bank_id'),
    exceptionCode: text('exception_code'),
    tagStatus: text('tag_status').notNull(),
    status: fastagSessionStatus('status').notNull(),
    paymentIntentId: uuid('payment_intent_id'),
    energyWh: bigint('energy_wh', { mode: 'number' }),
    amountPaise: bigint('amount_paise', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('fastag_sessions_lookup_key_uidx').on(table.lookupKey),
    index('fastag_sessions_station_reference_idx').on(table.stationReference),
  ],
);

export const paymentIntents = pgTable(
  'payment_intents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    idempotencyKey: text('idempotency_key').notNull(),
    userId: uuid('user_id').notNull(),
    vehicleRegistration: text('vehicle_registration').notNull(),
    sessionReference: text('session_reference').notNull(),
    amountPaise: bigint('amount_paise', { mode: 'number' }).notNull(),
    currency: text('currency').notNull().default('INR'),
    gateway: text('gateway').notNull(),
    gatewayReference: text('gateway_reference'),
    status: paymentStatus('status').notNull().default('CREATED'),
    failureReason: text('failure_reason'),
    rawResponse: jsonb('raw_response'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('payment_intents_idempotency_uidx').on(table.idempotencyKey)],
);

export const providerSyncRuns = pgTable('provider_sync_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: text('provider_id')
    .notNull()
    .references(() => providers.id),
  importedLocations: integer('imported_locations').notNull().default(0),
  status: text('status').notNull(),
  error: text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
});

export const vehicleProfiles = pgTable('vehicle_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  batteryCapacityKwh: numeric('battery_capacity_kwh', { precision: 7, scale: 2 }).notNull(),
  efficiencyWhPerKm: integer('efficiency_wh_per_km').notNull(),
  usableBatteryPercent: integer('usable_battery_percent').notNull().default(95),
  connectorStandards: text('connector_standards').array().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Station = typeof stations.$inferSelect;
export type NewPaymentIntent = typeof paymentIntents.$inferInsert;
