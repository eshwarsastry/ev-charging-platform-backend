import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { Environment } from '../config/env';
import { DATABASE, DATABASE_POOL, DatabaseService } from './database.service';
import * as schema from './schema';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>): Pool =>
        new Pool({
          connectionString: config.get('DATABASE_URL', { infer: true }),
          ssl: config.get('DATABASE_SSL', { infer: true })
            ? { rejectUnauthorized: true }
            : undefined,
          max: 10,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
        }),
    },
    {
      provide: DATABASE,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => drizzle(pool, { schema, casing: 'snake_case' }),
    },
    DatabaseService,
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
