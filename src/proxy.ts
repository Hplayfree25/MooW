import NextAuth from "next-auth";
import authConfig from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;

    const isAuthRoute = nextUrl.pathname === "/login" || nextUrl.pathname === "/register" || nextUrl.pathname === "/forgot-password";
    const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
    const isPublicRoute = isAuthRoute || isApiAuthRoute || nextUrl.pathname.startsWith("/public");

    if (isAuthRoute) {
        if (isLoggedIn) {
            return NextResponse.redirect(new URL("/", nextUrl));
        }
        return NextResponse.next();
    }

    if (!isLoggedIn && !isPublicRoute) {
        return NextResponse.redirect(new URL("/login", nextUrl));
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
