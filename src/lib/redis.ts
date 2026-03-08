import { Redis } from "@upstash/redis";

let redisUrl = process.env.CACHE_DATABASE_URL || "";
let redisToken = process.env.CACHE_DATABASE_TOKEN || "";

if (redisUrl.startsWith("redis://") || redisUrl.startsWith("rediss://")) {
    try {
        const parsed = new URL(redisUrl);
        redisToken = parsed.password || redisToken;
        redisUrl = `https://${parsed.hostname}`;
    } catch (e) {
        console.error("Failed to parse redis URL", e);
    }
}

export const redis = new Redis({
    url: redisUrl,
    token: redisToken,
});

export const CACHE_KEYS = {
    USER_PROFILE: (id: string) => `user:profile:${id}`,
    CHARACTER_DATA: (id: string) => `character:${id}`,
    CHARACTER_LIKES_BUFFER: (id: string) => `character:${id}:likes`,
    DAILY_TRENDING: `trending:characters:daily`,
};

export async function getCachedData<T>(key: string): Promise<T | null> {
    try {
        const data = await redis.get(key);
        if (data) return data as T;
    } catch (e) {
        console.error(`Redis Get Error for ${key}:`, e);
    }
    return null;
}

export async function setCachedData(key: string, data: any, ttlSeconds: number = 3600) {
    try {
        await redis.set(key, data, { ex: ttlSeconds });
    } catch (e) {
        console.error(`Redis Set Error for ${key}:`, e);
    }
}

export async function deleteCachedData(key: string) {
    try {
        await redis.del(key);
    } catch (e) {
        console.error(`Redis Del Error for ${key}:`, e);
    }
}

export async function incrementBuffer(key: string, amount: number = 1): Promise<number> {
    try {
        return await redis.incrby(key, amount);
    } catch (e) {
        console.error(`Redis Incr Error for ${key}:`, e);
        return 0;
    }
}
