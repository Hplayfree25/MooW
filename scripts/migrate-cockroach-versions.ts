import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const sql = postgres(process.env.LOG_DATABASE_URL!);

async function migrate() {
    console.log('🔄 Running CockroachDB Versioning migration...');

    try {
        await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS versions JSONB DEFAULT '[]'::jsonb`;
        console.log('✅ Added column "versions" to messages table');
    } catch (e: any) {
        console.error('❌ Migration failed versions:', e.message);
    }
    try {
        await sql`ALTER TABLE messages ADD COLUMN IF NOT EXISTS active_version_index INT DEFAULT 0`;
        console.log('✅ Added column "active_version_index" to messages table');
    } catch (e: any) {
        console.error('❌ Migration failed active_version_index:', e.message);
    }

    try {
        await sql`UPDATE messages SET versions = jsonb_build_array(content) WHERE jsonb_array_length(versions) = 0 OR versions IS NULL`;
        console.log('✅ Populated existing messages with default version');
    } catch (e: any) {
        console.error('❌ Data migration failed:', e.message);
    }

    await sql.end();
    console.log('🎉 Migration complete!');
}

migrate();
