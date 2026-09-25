import 'server-only';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from './schema';

let client: Sql | undefined;
let database: PostgresJsDatabase<typeof schema> | undefined;

export function getDb() {
  if (database) return database;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for authentication and student data.');
  }
  client = postgres(connectionString, { max: 5, prepare: false });
  database = drizzle(client, { schema });
  return database;
}

export async function closeDb() {
  if (client) {
    await client.end();
    client = undefined;
    database = undefined;
  }
}
