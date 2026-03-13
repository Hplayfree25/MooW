import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import Credentials from "next-auth/providers/credentials";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        ...authConfig.providers,
        Credentials({
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null;

                const username = credentials.username as string;
                const password = credentials.password as string;

                const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);

                if (!user || !user.password) {
                    return null;
                }

                const passwordsMatch = await bcrypt.compare(password, user.password);

                if (passwordsMatch) {
                    return user;
                }

                return null;
            },
        }),
    ],
    adapter: {
        ...DrizzleAdapter(db),
        async createUser(user) {
            let baseUsername = "";
            let generatedImage = user.image;

            if (user.name) {
                baseUsername = user.name.toLowerCase().replace(/[^a-z0-9_]/g, "");
            }

            if (!baseUsername) {
                baseUsername = "user";
            }

            const randomSuffix = Math.random().toString(36).substring(2, 6);
            const finalUsername = `${baseUsername}_${randomSuffix}`;

            if (!generatedImage) {
                generatedImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || finalUsername)}&background=random&color=fff`;
            }

            const [newUser] = await db.insert(users).values({
                ...user,
                username: finalUsername,
                name: user.name || finalUsername,
                image: generatedImage,
            }).returning();

            return newUser as any;
        }
    },
});
