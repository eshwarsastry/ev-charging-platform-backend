import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from './schema';

export const DATABASE = Symbol('DATABASE');
export const DATABASE_POOL = Symbol('DATABASE_POOL');

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  public constructor(
    @Inject(DATABASE) public readonly db: NodePgDatabase<typeof schema>,
    @Inject(DATABASE_POOL) private readonly pool: Pool,
  ) {}

  public async ping(): Promise<void> {
    await this.db.execute(sql`select 1`);
  }

  public async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
