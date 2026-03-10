"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { reports, users, characterComments, userBadges } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function checkStaff() {
    const session = await auth();
    if (!session?.user?.id) return false;

    const [staffBadge] = await db.select().from(userBadges).where(and(eq(userBadges.userId, session.user.id), eq(userBadges.badgeId, 2))).limit(1);
    return !!staffBadge;
}

export async function getReportsAction() {
    if (!(await checkStaff())) return { success: false, error: "Unauthorized" };

    try {
        const allReports = await db.select({
            report: reports,
            reporter: users,
        })
            .from(reports)
            .leftJoin(users, eq(reports.reporterId, users.id))
            .orderBy(desc(reports.createdAt));

        const enrichedReports = await Promise.all(allReports.map(async (r) => {
            let reportedEntity: any = null;
            let reportedUser: any = null;

            if (r.report.reportedUserId) {
                const [user] = await db.select().from(users).where(eq(users.id, r.report.reportedUserId)).limit(1);
                reportedUser = user;
            }

            if (r.report.reportedCommentId) {
                const [comment] = await db.select().from(characterComments).where(eq(characterComments.id, r.report.reportedCommentId)).limit(1);
                reportedEntity = comment;
                if (comment && !reportedUser && comment.userId) {
                    const [user] = await db.select().from(users).where(eq(users.id, comment.userId)).limit(1);
                    reportedUser = user;
                }
            }

            return {
                ...r.report,
                reporterName: r.reporter?.username || "Unknown",
                reportedUserName: reportedUser?.username || "Unknown",
                reportedContent: reportedEntity?.content || null,
                reportedUserBanned: reportedUser?.isBanned || false,
            };
        }));

        return { success: true, data: enrichedReports };
    } catch (error) {
        console.error("Failed to fetch reports:", error);
        return { success: false, error: "Failed to fetch reports" };
    }
}

export async function updateReportStatusAction(reportId: string, status: 'resolved' | 'dismissed') {
    if (!(await checkStaff())) return { success: false, error: "Unauthorized" };

    try {
        await db.update(reports).set({ status }).where(eq(reports.id, reportId));
        revalidatePath("/admin/reports");
        return { success: true };
    } catch (error) {
        console.error("Failed to update report:", error);
        return { success: false, error: "Failed to update report" };
    }
}
