"use client";

import React from "react";
import { ErrorView } from "@/components/ErrorView";
import "@/app/globals.css";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body>
                <ErrorView error={error} reset={reset} />
            </body>
        </html>
    );
}
