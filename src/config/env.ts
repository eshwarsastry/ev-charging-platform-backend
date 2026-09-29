import { z } from 'zod';

const providerSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
  displayName: z.string().min(1).max(100),
  enabled: z.boolean().default(true),
  baseUrl: z.url().refine((url) => new URL(url).protocol === 'https:', 'OCPI requires HTTPS'),
  token: z.string().min(1),
});

const ocpiProviders = z
  .string()
  .default('[]')
  .transform((value, context) => {
    try {
      const result = z.array(providerSchema).max(100).parse(JSON.parse(value));
      const ids = result.map((provider) => provider.id);
      if (
        new Set(ids).size !== ids.length ||
        ids.some((id) => ['pulse-energy', 'ionage', 'seed'].includes(id))
      ) {
        throw new Error('Duplicate or reserved provider ID');
      }
      return result;
    } catch {
      context.addIssue({
        code: 'custom',
        message:
          'OCPI_PROVIDERS_JSON must be a valid provider array with unique IDs, HTTPS baseUrl and token',
      });
      return z.NEVER;
    }
  });

const booleanString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const optionalUrl = z.preprocess((value) => (value === '' ? undefined : value), z.url().optional());

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    DATABASE_URL: z.string().url(),
    DATABASE_SSL: booleanString,
    CORS_ORIGINS: z.string().default('http://localhost:4200'),
    ADMIN_API_KEY: z.string().min(32),
    GOOGLE_MAPS_API_KEY: z.string().default(''),
    GOOGLE_ROUTES_BASE_URL: z.string().url().default('https://routes.googleapis.com'),
    PULSE_ENERGY_ENABLED: booleanString,
    PULSE_ENERGY_OCPI_BASE_URL: optionalUrl,
    PULSE_ENERGY_OCPI_TOKEN: z.string().optional(),
    IONAGE_ENABLED: booleanString,
    IONAGE_OCPI_BASE_URL: optionalUrl,
    IONAGE_OCPI_TOKEN: z.string().optional(),
    OCPI_PROVIDERS_JSON: ocpiProviders,
    ENABLE_PAYMENT_SANDBOX: booleanString,
    FASTAG_MODE: z.enum(['mock', 'partner']).default('mock'),
    FASTAG_PARTNER_BASE_URL: optionalUrl,
    FASTAG_PARTNER_CLIENT_ID: z.string().optional(),
    FASTAG_PARTNER_CLIENT_SECRET: z.string().optional(),
    FASTAG_WEBHOOK_SECRET: z.string().min(32),
  })
  .superRefine((env, context) => {
    if (env.ENABLE_PAYMENT_SANDBOX && env.FASTAG_MODE !== 'mock') {
      context.addIssue({ code: 'custom', message: 'Payment sandbox requires FASTAG_MODE=mock' });
    }
    const pairs = [
      [
        'PULSE_ENERGY',
        env.PULSE_ENERGY_ENABLED,
        env.PULSE_ENERGY_OCPI_BASE_URL,
        env.PULSE_ENERGY_OCPI_TOKEN,
      ],
      ['IONAGE', env.IONAGE_ENABLED, env.IONAGE_OCPI_BASE_URL, env.IONAGE_OCPI_TOKEN],
    ] as const;

    for (const [name, enabled, baseUrl, token] of pairs) {
      if (enabled && (!baseUrl || !token)) {
        context.addIssue({
          code: 'custom',
          message: `${name}_OCPI_BASE_URL and ${name}_OCPI_TOKEN are required when enabled`,
        });
      }
    }

    if (
      env.FASTAG_MODE === 'partner' &&
      (!env.FASTAG_PARTNER_BASE_URL ||
        !env.FASTAG_PARTNER_CLIENT_ID ||
        !env.FASTAG_PARTNER_CLIENT_SECRET)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'FASTag partner URL and credentials are required in partner mode',
      });
    }
  });

export type Environment = z.infer<typeof envSchema>;

export function validateEnvironment(input: Record<string, unknown>): Environment {
  const result = envSchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
