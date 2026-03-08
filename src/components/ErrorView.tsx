"use client";

import React, { useEffect, useRef, useState } from "react";
import { RotateCw, Home, AlertTriangle, Mail } from "lucide-react";
import Link from "next/link";
import gsap from "gsap";
import styles from "./ErrorPages.module.css";

const panicCodes = [
    "ERR_CONNECTION_REFUSED",
    "FATAL EXCEPTION: main",
    "0x0000007B INACCESSIBLE_BOOT_DEVICE",
    "SEGMENTATION FAULT (core dumped)",
    "Uncaught TypeError: undefined is not a function",
    "Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)",
    "Maximum call stack size exceeded",
    "Deadlock detected in thread 0x4B3A",
    "MEMORY LEAK DETECTED: 4096 bytes lost",
    "[CRITICAL] Database connection pool exhausted",
    "Exception in thread 'main' java.lang.OutOfMemoryError",
    "SyntaxError: missing ) after argument list"
];

function buildMailto(error: Error & { digest?: string }) {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "Unknown";
    const platform = typeof navigator !== "undefined" ? (navigator as any).userAgentData?.platform || navigator.platform || "Unknown" : "Unknown";
    const lang = typeof navigator !== "undefined" ? navigator.language : "Unknown";
    const screen = typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "Unknown";
    const viewport = typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "Unknown";
    const url = typeof window !== "undefined" ? window.location.href : "Unknown";
    const time = new Date().toISOString();
    const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(ua);
    const connection = typeof navigator !== "undefined" && (navigator as any).connection
        ? `${(navigator as any).connection.effectiveType || "Unknown"}`
        : "Unknown";

    const subject = `[BUG REPORT] System Exception — ${error.name || "Unknown Error"}`;
    const body = [
        "===========================================================",
        "                 SYSTEM ERROR REPORT                       ",
        "===========================================================",
        "",
        "USER NOTES (Please describe what you were doing before this error):",
        "",
        "",
        "",
        "===========================================================",
        "                    TECHNICAL LOGS                         ",
        "===========================================================",
        "",
        "[ ERROR DETAILS ]",
        `Type       : ${error.name || "N/A"}`,
        `Message    : ${error.message || "N/A"}`,
        `Digest     : ${error.digest || "N/A"}`,
        `Stack Trace:`,
        `${(error.stack || "No stack trace available").split("\n").slice(0, 6).map(l => "    " + l.trim()).join("\n")}`,
        "",
        "[ DEVICE & ENVIRONMENT ]",
        `Platform   : ${platform}`,
        `Mobile     : ${isMobile ? "Yes" : "No"}`,
        `Language   : ${lang}`,
        `Screen     : ${screen}`,
        `Viewport   : ${viewport}`,
        `Network    : ${connection}`,
        "",
        "[ CONTEXT & TRACE ]",
        `URL        : ${url}`,
        `Timestamp  : ${time}`,
        `User Agent : ${ua}`,
        "",
        "===========================================================",
        "NOTICE: This is an auto-generated diagnostic report.",
        "Please do not modify the technical logs above.",
        "==========================================================="
    ].join("\n");

    return `mailto:support@moow.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function ErrorView({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const glitchTextRef = useRef<HTMLHeadingElement>(null);
    const [liveCode, setLiveCode] = useState<string[]>([]);
    const [mailHref, setMailHref] = useState("mailto:support@moow.com");

    useEffect(() => {
        console.error("Application error:", error);
        setMailHref(buildMailto(error));
    }, [error]);

    useEffect(() => {
        const interval = setInterval(() => {
            setLiveCode(prev => {
                const newCode = [...prev, `[${new Date().toISOString()}] ${panicCodes[Math.floor(Math.random() * panicCodes.length)]}`];
                if (newCode.length > 30) newCode.shift();
                return newCode;
            });
        }, 150);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!containerRef.current || !glitchTextRef.current) return;

        const ctx = gsap.context(() => {
            gsap.from(`.${styles.card} > *:not(.${styles.codeBackground})`, {
                y: 30,
                opacity: 0,
                duration: 0.8,
                stagger: 0.15,
                ease: "back.out(1.7)",
            });

            const tl = gsap.timeline({ repeat: -1, repeatDelay: 2.5 });
            tl.to(glitchTextRef.current, { x: 5, skewX: 30, duration: 0.05 })
                .to(glitchTextRef.current, { x: -5, skewX: -30, opacity: 0.5, duration: 0.05 })
                .to(glitchTextRef.current, { x: 0, skewX: 0, opacity: 1, duration: 0.05 })
                .to(glitchTextRef.current, { scale: 1.05, duration: 0.05 })
                .to(glitchTextRef.current, { scale: 1, duration: 0.05 });

            gsap.to(`.${styles.iconContainer}`, {
                y: -5,
                rotation: 15,
                scale: 1.1,
                duration: 0.1,
                yoyo: true,
                repeat: -1,
            });

            gsap.to(containerRef.current, {
                backgroundColor: "rgba(255, 0, 0, 0.03)",
                duration: 0.1,
                yoyo: true,
                repeat: -1,
                repeatDelay: Math.random() * 2
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <main
            ref={containerRef}
            className={`${styles.mainContainer} ${styles.panicContainer}`}
        >
            <div className={styles.codeBackground}>
                {liveCode.map((code, i) => (
                    <div key={i} className={styles.codeLine}>{code}</div>
                ))}
            </div>

            <div className={`${styles.card} ${styles.panicCard}`}>
                <div className={styles.iconContainer} style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', zIndex: 10 }}>
                    <AlertTriangle className={styles.icon} style={{ color: '#ef4444' }} />
                </div>

                <h1
                    ref={glitchTextRef}
                    className={styles.title}
                    style={{ color: '#ef4444', textTransform: 'uppercase', letterSpacing: '2px', zIndex: 10 }}
                >
                    System Failure
                </h1>

                <p className={styles.description} style={{ fontWeight: 500, zIndex: 10 }}>
                    A critical exception occurred. The application state is corrupted.
                </p>
                <p className={styles.descriptionSmall} style={{ color: '#ef4444', fontWeight: 600, zIndex: 10 }}>
                    {error?.digest ? `Error Digest: ${error.digest}` : 'Unexpected fatal error detected.'}
                </p>

                <div className={styles.actionGroup} style={{ marginTop: '2rem', zIndex: 10 }}>
                    <button
                        onClick={() => reset()}
                        className={styles.btnDestructive}
                    >
                        <RotateCw className={styles.btnIcon} />
                        Attempt Reboot
                    </button>

                    <Link
                        href="/"
                        className={styles.btnSecondary}
                    >
                        <Home className={styles.btnIcon} />
                        Flee to Home
                    </Link>

                    <a
                        href={mailHref}
                        className={styles.btnSecondary}
                        style={{ border: '1px solid rgba(239, 68, 68, 0.5)', color: '#ef4444' }}
                    >
                        <Mail className={styles.btnIcon} />
                        Contact Our Team
                    </a>
                </div>
            </div>
        </main>
    );
}
