import "@/app/globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { userBadges } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import AdminSidebar from "./AdminSidebar";
import { Inter } from "next/font/google";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
});

export const metadata = {
    title: "Messager Staff Admin",
    description: "Administration and Moderation Panel",
};

export default async function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
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

    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.variable} font-sans antialiased text-primary`}>
                <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
                    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
                        <AdminSidebar />
                        <main style={{ flex: 1, overflowY: 'auto' }}>
                            {children}
                        </main>
                    </div>
                    <Toaster position="top-center" theme="dark" />
                </ThemeProvider>
            </body>
        </html>
    );
}
