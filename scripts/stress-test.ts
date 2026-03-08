import "dotenv/config";
import { db, dbChat } from "../src/db";
import { redis } from "../src/lib/redis";
import { users } from "../src/db/schema";
import { chats, messages } from "../src/db/schema.logs";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function runTests() {

    const ITERATIONS = 20;

    console.log(">> Testing Upstash Redis...");
    try {
        const startRedisWrite = performance.now();
        for (let i = 0; i < ITERATIONS; i++) {
            await redis.set(`test:key:${i}`, `value-${i}`, { ex: 60 });
        }
        const endRedisWrite = performance.now();
        console.log(`  [+] Writes (${ITERATIONS}): ${(endRedisWrite - startRedisWrite).toFixed(2)}ms`);

        const startRedisRead = performance.now();
        for (let i = 0; i < ITERATIONS; i++) {
            await redis.get(`test:key:${i}`);
        }
        const endRedisRead = performance.now();
        console.log(`  [+] Reads (${ITERATIONS}): ${(endRedisRead - startRedisRead).toFixed(2)}ms`);
        console.log("  [✓] Upstash Redis OK\n");
    } catch (e) {
        console.error("  [X] Upstash Redis Failed:", (e as any).message);
    }

    console.log(">> Testing Turso SQLite...");
    const dummyUserId = crypto.randomUUID();
    try {
        const startTursoWrite = performance.now();
        await db.insert(users).values({
            id: dummyUserId,
            username: `testuser_${Date.now()}`,
            password: "dummy_password",
            image: "dummy_image"
        });
        const endTursoWrite = performance.now();
        console.log(`  [+] 1 Insert: ${(endTursoWrite - startTursoWrite).toFixed(2)}ms`);

        const startTursoRead = performance.now();
        await db.select().from(users).where(eq(users.id, dummyUserId));
        const endTursoRead = performance.now();
        console.log(`  [+] 1 Select: ${(endTursoRead - startTursoRead).toFixed(2)}ms`);

        await db.delete(users).where(eq(users.id, dummyUserId));
        console.log("  [✓] Turso SQLite OK\n");
    } catch (e) {
        console.error("  [X] Turso SQLite Failed:", (e as any).message);
    }

    console.log(">> Testing CockroachDB (PostgreSQL)...");
    const dummyChatId = crypto.randomUUID();
    try {
        const startCrdbWriteChat = performance.now();
        await dbChat.insert(chats).values({
            id: dummyChatId,
            userId: dummyUserId,
            characterId: crypto.randomUUID(),
        });
        const endCrdbWriteChat = performance.now();
        console.log(`  [+] 1 Chat Insert: ${(endCrdbWriteChat - startCrdbWriteChat).toFixed(2)}ms`);

        const startCrdbWriteMsgs = performance.now();
        const msgPromises = [];
        for (let i = 0; i < ITERATIONS; i++) {
            msgPromises.push(dbChat.insert(messages).values({
                id: crypto.randomUUID(),
                chatId: dummyChatId,
                role: i % 2 === 0 ? "user" : "ai",
                content: `Stress test message ${i}`
            }));
        }
        await Promise.all(msgPromises);
        const endCrdbWriteMsgs = performance.now();
        console.log(`  [+] ${ITERATIONS} Msg Inserts (Parallel): ${(endCrdbWriteMsgs - startCrdbWriteMsgs).toFixed(2)}ms`);

        const startCrdbReadMsgs = performance.now();
        await dbChat.select().from(messages).where(eq(messages.chatId, dummyChatId));
        const endCrdbReadMsgs = performance.now();
        console.log(`  [+] Select ${ITERATIONS} Msgs: ${(endCrdbReadMsgs - startCrdbReadMsgs).toFixed(2)}ms`);

        await dbChat.delete(messages).where(eq(messages.chatId, dummyChatId));
        await dbChat.delete(chats).where(eq(chats.id, dummyChatId));
        console.log("  [✓] CockroachDB OK\n");
    } catch (e) {
        console.error("  [X] CockroachDB Failed:", (e as any).message);
    }

    console.log("Stress tests complete.");
    process.exit(0);
}

runTests();
