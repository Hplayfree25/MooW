"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { RateLimiter } from "@/lib/rate-limit";

const authRateLimiter = new RateLimiter(60 * 1000 * 15, 5);

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    const username = formData.get("username") as string;
    const { success } = await authRateLimiter.check(`auth_${username || 'unknown'}`);

    if (!success) {
        return "Too many failed login attempts. Please try again in 15 minutes.";
    }

    try {
        await signIn("credentials", formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return "Invalid credentials.";
                default:
                    return "Something went wrong.";
            }
        }
        throw error;
    }
}

export async function register(
    prevState: string | undefined,
    formData: FormData,
) {
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    if (!username || !password) {
        return "Username and password are required.";
    }

    const { success } = await authRateLimiter.check(`register_${username}`);
    if (!success) {
        return "Too many registration attempts. Please try again later.";
    }

    if (password.length < 6) {
        return "Password must be at least 6 characters long.";
    }

    const [existingUser] = await db.select().from(users).where(eq(users.username, username));
    if (existingUser) {
        return "Username is already taken.";
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const defaultImage = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff`;
        await db.insert(users).values({
            username: username,
            password: hashedPassword,
            image: defaultImage,
        });
    } catch (error) {
        console.error("Registration error:", error);
        return "Failed to create account. Please try again.";
    }

    const { redirect } = await import("next/navigation");
    redirect("/login");
}

export async function setupUsernameAction(personaName: string) {
    try {
        const { auth } = await import("@/auth");
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "You must be logged in.", success: false };
        }

        if (!personaName || personaName.trim().length === 0) {
            return { error: "Name is required.", success: false };
        }

        const validName = personaName.trim();

        if (!/^[a-zA-Z0-9_ ]{1,44}$/.test(validName)) {
            return { error: "Name must be 1-44 characters, letters, numbers, spaces and underscores only.", success: false };
        }

        await db.update(users).set({ name: validName }).where(eq(users.id, session.user.id));

        return { success: true };
    } catch (error) {
        console.error("Setup username error:", error);
        return { error: "Failed to set persona name.", success: false };
    }
}
