"use client";

import React from "react";
import { ErrorView } from "@/components/ErrorView";

export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return <ErrorView error={error} reset={reset} />;
}
