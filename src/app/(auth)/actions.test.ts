jest.mock("next-auth", () => {
    class AuthError extends Error {
        type: string;
        constructor(message: string) {
            super(message);
            this.type = message;
            this.name = "AuthError";
        }
    }
    return { AuthError };
});

jest.mock("@/auth", () => ({
    signIn: jest.fn(),
}));

jest.mock("@/db", () => ({
    db: {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([]),
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock("@/db/schema", () => ({
    users: {},
}));

jest.mock("drizzle-orm", () => ({
    eq: jest.fn(),
}));

jest.mock("next/navigation", () => ({
    redirect: jest.fn(),
}));

jest.mock("bcryptjs", () => ({
    __esModule: true,
    default: {
        hash: jest.fn().mockResolvedValue("hashedPassword123"),
        compare: jest.fn(),
    },
}));

jest.mock("@/lib/rate-limit", () => {
    let callCount = 0;
    return {
        RateLimiter: jest.fn().mockImplementation(() => ({
            check: jest.fn().mockImplementation(async (key: string) => {
                if (key.startsWith("auth_bruteforce_test")) {
                    callCount++;
                    if (callCount > 5) {
                        return { success: false, remaining: 0, resetAt: Date.now() + 900000 };
                    }
                }
                return { success: true, remaining: 5, resetAt: Date.now() + 900000 };
            }),
        })),
    };
});

import { authenticate, register } from "./actions";
import { signIn } from "@/auth";
import { db } from "@/db";
import { redirect } from "next/navigation";

describe("Authentication Server Actions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("authenticate (Login)", () => {
        it("should call NextAuth signIn with credentials", async () => {
            const formData = new FormData();
            formData.append("username", "testuser");
            formData.append("password", "password123");

            (signIn as jest.Mock).mockResolvedValueOnce(undefined);

            const result = await authenticate(undefined, formData);

            expect(signIn).toHaveBeenCalledWith("credentials", formData);
            expect(result).toBeUndefined();
        });

        it("should return error message on CredentialsSignin", async () => {
            const formData = new FormData();
            formData.append("username", "testuser2");
            formData.append("password", "wrongpass");

            const { AuthError } = require("next-auth");
            const authError = new AuthError("CredentialsSignin");

            (signIn as jest.Mock).mockRejectedValueOnce(authError);

            const result = await authenticate(undefined, formData);
            expect(result).toBe("Invalid credentials.");
        });

        it("should rethrow non-AuthError errors", async () => {
            const formData = new FormData();
            formData.append("username", "testuser3");
            formData.append("password", "wrongpass");

            (signIn as jest.Mock).mockRejectedValueOnce(new Error("Network down"));

            await expect(authenticate(undefined, formData)).rejects.toThrow("Network down");
        });
    });

    describe("register", () => {
        it("should require username and password", async () => {
            const formData = new FormData();
            const result = await register(undefined, formData);
            expect(result).toBe("Username and password are required.");
        });

        it("should enforce minimum password length of 6", async () => {
            const formData = new FormData();
            formData.append("username", "newuser");
            formData.append("password", "short");
            const result = await register(undefined, formData);
            expect(result).toBe("Password must be at least 6 characters long.");
        });

        it("should reject duplicate usernames", async () => {
            const formData = new FormData();
            formData.append("username", "existinguser");
            formData.append("password", "password123");

            (db.select().from({} as any).where as jest.Mock).mockResolvedValueOnce([{ id: "1", name: "existinguser" }]);

            const result = await register(undefined, formData);
            expect(result).toBe("Username is already taken.");
        });

        it("should hash password and create user successfully", async () => {
            const formData = new FormData();
            formData.append("username", "brandnewuser");
            formData.append("password", "secure123");

            (db.select().from({} as any).where as jest.Mock).mockResolvedValueOnce([]);

            await register(undefined, formData);

            expect(redirect).toHaveBeenCalledWith("/login");
        });
    });

    describe("Rate Limiter (Brute Force Protection)", () => {
        it("should block login after exceeding rate limit", async () => {
            const formData = new FormData();
            formData.append("username", "bruteforce_test");
            formData.append("password", "wrongpass");

            (signIn as jest.Mock).mockRejectedValue(new Error("test"));

            for (let i = 0; i < 5; i++) {
                try {
                    await authenticate(undefined, formData);
                } catch {

                }
            }

            const result = await authenticate(undefined, formData);
            expect(result).toBe("Too many failed login attempts. Please try again in 15 minutes.");
        });
    });
});
