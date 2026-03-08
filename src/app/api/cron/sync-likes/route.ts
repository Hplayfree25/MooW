import { NextResponse } from "next/server";
import { redis, CACHE_KEYS } from "@/lib/redis";
import { db } from "@/db";
import { characters } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const keys = await redis.keys("character:*:likes");
        if (!keys || keys.length === 0) {
            return NextResponse.json({ success: true, message: "No likes to sync" });
        }

        const syncResults = [];

        for (const key of keys) {
            const characterId = key.split(":")[1];
            if (!characterId) continue;

            const incrementStr = await redis.get(key);
            const increment = parseInt(incrementStr as string, 10);

            if (increment && increment !== 0) {
                try {
                    await db.update(characters)
                        .set({
                            likesCount: sql`MAX(0, ${characters.likesCount} + ${increment})`,
                            updatedAt: sql`(strftime('%s', 'now'))`
                        })
                        .where(eq(characters.id, characterId));
                    await redis.del(key);
                    syncResults.push({ characterId, increment, status: "success" });
                } catch (e) {
                    syncResults.push({ characterId, increment, status: "error", error: String(e) });
                }
            } else {
                await redis.del(key);
            }
        }

        return NextResponse.json({ success: true, synced: syncResults });
    } catch (e) {
        return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
    }
}
