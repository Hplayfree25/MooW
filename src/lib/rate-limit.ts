import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export class RateLimiter {
    private ratelimit: Ratelimit;

    constructor(windowMs: number, maxRequests: number) {
        this.ratelimit = new Ratelimit({
            redis: Redis.fromEnv(),
            limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs} ms` as any),
            analytics: true,
            prefix: "@upstash/ratelimit",
        });
    }

    public async check(key: string): Promise<{ success: boolean; remaining: number; resetAt: number }> {
        const { success, remaining, reset } = await this.ratelimit.limit(key);
        return { success, remaining, resetAt: reset };
    }
}
