"use client";

if (typeof window !== "undefined") {
    const originalError = console.error;
    console.error = (...args: any[]) => {
        if (typeof args[0] === "string") {
            if (
                args[0].includes("A tree hydrated but some attributes of the server rendered HTML didn't match the client properties") ||
                args[0].includes("Hydration failed because the initial UI does not match what was rendered on the server") ||
                args[0].includes("Warning: Expected server HTML to contain a matching")
            ) {
                return;
            }
        }
        originalError.apply(console, args);
    };
}

export function ConsoleErrorPatcher() {
    return null;
}
