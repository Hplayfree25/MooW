import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schemaLogs from './schema.logs';

const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN,
});
export const db = drizzleLibsql(client, { schema });

const queryClient = postgres(process.env.LOG_DATABASE_URL!);
export const dbChat = drizzlePg(queryClient, { schema: schemaLogs });
