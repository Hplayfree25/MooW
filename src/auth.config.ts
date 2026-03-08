import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

export default {
    providers: [
        GitHub,
        Google,
    ],
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    callbacks: {
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub;

                try {
                    const { db } = await import("@/db");
                    const { users } = await import("@/db/schema");
                    const { eq } = await import("drizzle-orm");

                    const [dbUser] = await db.select({ username: users.username, image: users.image })
                        .from(users).where(eq(users.id, token.sub)).limit(1);
                    if (dbUser) {
                        session.user.name = dbUser.username;
                        session.user.image = dbUser.image;
                    }
                } catch (e) {
                    console.error("Failed to fetch fresh user data for session:", e);
                }
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.sub = user.id;
            }
            return token;
        },
    },
} satisfies NextAuthConfig;
