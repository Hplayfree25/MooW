import { auth } from "@/auth";
import { db } from "@/db";
import { users, userSettings, userApiConfigurations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import styles from "./settings.module.css";
import { SettingsForm } from "@/app/(main)/settings/SettingsForm";

export default async function SettingsPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);

    if (!user) {
        redirect("/login");
    }

    let [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, session.user.id)).limit(1);
    if (!settings) {
        await db.insert(userSettings).values({ userId: session.user.id });
        const res = await db.select().from(userSettings).where(eq(userSettings.userId, session.user.id)).limit(1);
        settings = res[0];
    }

    const apiConfigs = await db.select().from(userApiConfigurations).where(eq(userApiConfigurations.userId, session.user.id));

    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <h1 className={styles.title}>Settings</h1>
                <div className={styles.card}>
                    <SettingsForm
                        user={user}
                        settings={settings}
                        apiConfigs={apiConfigs}
                    />
                </div>
            </div>
        </div>
    );
}
