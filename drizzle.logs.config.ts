import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

export default defineConfig({
    schema: './src/db/schema.logs.ts',
    out: './drizzle/logs',
    dialect: 'postgresql',
    dbCredentials: {
        url: process.env.LOG_DATABASE_URL!,
    },
});
