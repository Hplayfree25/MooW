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

        const increments = await redis.mget(...keys);

        const syncResults = [];
        const batchQueries: any[] = [];
        const keysToDelete: string[] = [];

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const characterId = key.split(":")[1];
            if (!characterId) continue;

            const incrementStr = increments[i];
            const increment = parseInt(incrementStr as string, 10);

            if (increment && increment !== 0) {
                batchQueries.push(
                    db.update(characters)
                        .set({
                            likesCount: sql`MAX(0, ${characters.likesCount} + ${increment})`,
                            updatedAt: sql`(strftime('%s', 'now'))`
                        })
                        .where(eq(characters.id, characterId))
                );
                syncResults.push({ characterId, increment, status: "success" });
            }

            keysToDelete.push(key);
        }

        if (batchQueries.length > 0) {
            try {
                await db.batch(batchQueries as any);

                if (keysToDelete.length > 0) {
                    await redis.del(...keysToDelete);
                }
            } catch (e) {
                syncResults.forEach(r => r.status = "error");
                return NextResponse.json({ success: false, error: String(e), synced: syncResults }, { status: 500 });
            }
        } else if (keysToDelete.length > 0) {
            await redis.del(...keysToDelete);
        }

        return NextResponse.json({ success: true, synced: syncResults });
    } catch (e) {
        return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
    }
}
