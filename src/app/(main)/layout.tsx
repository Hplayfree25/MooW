import Sidebar from "@/components/Sidebar";
import styles from "@/app/layout.module.css";
import { auth, signOut } from "@/auth";
import WelcomeOnboarding from "@/components/WelcomeOnboarding";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await auth();

    if (session?.user?.id) {
        const [currentUser] = await db.select({
            persona: users.name
        }).from(users).where(eq(users.id, session.user.id)).limit(1);

        if (!currentUser) {
            await signOut({ redirect: false });
            redirect("/login");
        }

        if (!currentUser.persona) {
            return <WelcomeOnboarding />;
        }
    }

    return (
        <div className={styles.layoutWrapper} suppressHydrationWarning>
            <Sidebar />
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
}
