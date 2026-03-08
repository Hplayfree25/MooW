import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const sql = postgres(process.env.LOG_DATABASE_URL!);

async function migrate() {
    console.log('🔄 Running CockroachDB migration...');

    try {
        await sql`ALTER TABLE chats ADD COLUMN IF NOT EXISTS chat_memory TEXT`;
        console.log('✅ Added column "chat_memory" to chats table');
    } catch (e: any) {
        if (e.message?.includes('already exists')) {
            console.log('ℹ️  Column "chat_memory" already exists, skipping.');
        } else {
            console.error('❌ Migration failed:', e.message);
        }
    }

    await sql.end();
    console.log('🎉 Migration complete!');
}

migrate();
