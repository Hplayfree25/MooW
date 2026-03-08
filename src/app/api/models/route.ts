import { auth } from "@/auth";
import { db } from "@/db";
import { userApiConfigurations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const configId = req.nextUrl.searchParams.get("configId");
        if (!configId) {
            return NextResponse.json({ error: "configId is required" }, { status: 400 });
        }

        const [config] = await db.select().from(userApiConfigurations)
            .where(eq(userApiConfigurations.id, configId)).limit(1);

        if (!config || config.userId !== session.user.id) {
            return NextResponse.json({ error: "Config not found" }, { status: 404 });
        }

        const apiKey = decrypt(config.apiKey);
        const baseUrl = config.apiUrl.replace(/\/+$/, "");

        let models: { id: string; name: string }[] = [];

        if (config.apiFormat === "claude") {
            const res = await fetch(`${baseUrl}/v1/models`, {
                headers: {
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                },
            });

            if (!res.ok) {
                const text = await res.text();
                return NextResponse.json({ error: `API error: ${res.status} - ${text}` }, { status: res.status });
            }

            const data = await res.json();
            models = (data.data || []).map((m: any) => ({
                id: m.id,
                name: m.display_name || m.id,
            }));
        } else {
            const res = await fetch(`${baseUrl}/v1/models`, {
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                },
            });

            if (!res.ok) {
                const text = await res.text();
                return NextResponse.json({ error: `API error: ${res.status} - ${text}` }, { status: res.status });
            }

            const data = await res.json();
            models = (data.data || []).map((m: any) => ({
                id: m.id,
                name: m.id,
            }));
        }

        return NextResponse.json({ models });
    } catch (error: any) {
        console.error("Failed to fetch models:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch models" }, { status: 500 });
    }
}
