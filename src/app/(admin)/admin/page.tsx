import React from "react";
import { auth } from "@/auth";
import { db } from "@/db";
import { userBadges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import AdminPanelClient from "./AdminPanelClient";

export default async function AdminPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/");

    const [isStaff] = await db.select()
        .from(userBadges)
        .where(
            and(eq(userBadges.userId, session.user.id), eq(userBadges.badgeId, 2))
        ).limit(1);

    if (!isStaff) {
        redirect("/");
    }

    return <AdminPanelClient />;
}
