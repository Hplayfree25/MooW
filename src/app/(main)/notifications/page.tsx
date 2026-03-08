import { auth } from "@/auth";
import { redirect } from "next/navigation";
import styles from "./notifications.module.css";
import { Bell, CheckCircle2 } from "lucide-react";

// Kerjain nnati
export default async function NotificationsPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Notifications</h1>
                    <button className={styles.markAllBtn}>
                        <CheckCircle2 size={16} />
                        Mark all as read
                    </button>
                </div>

                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <Bell size={48} />
                    </div>
                    <h2>No notifications yet</h2>
                    <p>When you get comments, likes, or other updates, they'll show up here.</p>
                </div>
            </div>
        </div>
    );
}
