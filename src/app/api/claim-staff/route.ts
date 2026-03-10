import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { userBadges } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Not logged in. Log in first." }, { status: 401 });
        }

        const staffBadges = await db.select().from(userBadges).where(eq(userBadges.badgeId, 2));

        if (staffBadges.length > 0) {
            return NextResponse.json({ error: "A staff member already exists. Only existing staff can grant the badge to others." }, { status: 403 });
        }

        await db.insert(userBadges).values({ userId: session.user.id, badgeId: 2 });

        return NextResponse.json({
            success: true,
            message: "Success! You have claimed the first Staff badge! You can now navigate to /admin to manage platform and give badges to others."
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
