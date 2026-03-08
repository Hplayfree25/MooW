"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { AnimatedBg } from "@/components/AnimatedBg";
import { ArrowLeft, Home } from "lucide-react";
import styles from "@/components/ErrorPages.module.css";

export default function NotFound() {
    const containerRef = useRef<HTMLDivElement>(null);
    const text404Ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !text404Ref.current) return;
        const ctx = gsap.context(() => {
            gsap.from(`.${styles.errorContent404} > h1, .${styles.errorContent404} > p, .${styles.actionGroup}`, {
                y: 40,
                opacity: 0,
                duration: 1,
                ease: "power4.out",
                stagger: 0.2,
                delay: 0.5
            });

            const chars = gsap.utils.toArray<HTMLElement>('.char-404');

            gsap.from(chars, {
                y: 100,
                opacity: 0,
                rotationX: -90,
                transformOrigin: "bottom center",
                duration: 1.2,
                stagger: 0.15,
                ease: "elastic.out(1, 0.5)",
            });

            chars.forEach((char, i) => {
                gsap.to(char, {
                    y: i % 2 === 0 ? -15 : 15,
                    rotationZ: i === 1 ? 5 : -5,
                    duration: 2 + i * 0.5,
                    ease: "sine.inOut",
                    yoyo: true,
                    repeat: -1,
                });
            });

            const handleMouseMove = (e: MouseEvent) => {
                const { clientX, clientY } = e;
                const { innerWidth, innerHeight } = window;
                const xPos = (clientX / innerWidth - 0.5) * 40;
                const yPos = (clientY / innerHeight - 0.5) * 40;

                gsap.to(chars[0], { x: xPos * -1.5, y: yPos * -1.5, rotationY: xPos, duration: 1, ease: "power2.out" });
                gsap.to(chars[1], { x: xPos * 0.5, y: yPos * 0.5, rotationY: xPos * -1, duration: 1, ease: "power2.out" });
                gsap.to(chars[2], { x: xPos * 1.5, y: yPos * 1.5, rotationY: xPos, duration: 1, ease: "power2.out" });
            };

            text404Ref.current?.addEventListener('mouseenter', () => {
                gsap.to(chars, {
                    skewX: "random(-20, 20)",
                    scale: "random(0.8, 1.2)",
                    color: () => gsap.utils.random(["#ef4444", "#3b82f6", "#10b981", "var(--text-primary)"]),
                    duration: 0.1,
                    repeat: 5,
                    yoyo: true,
                    onComplete: () => {
                        gsap.to(chars, { skewX: 0, scale: 1, color: "var(--text-primary)", duration: 0.2 });
                    }
                });
            });

            window.addEventListener("mousemove", handleMouseMove);
            return () => {
                window.removeEventListener("mousemove", handleMouseMove);
            };
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <main
            ref={containerRef}
            className={styles.mainContainer}
            style={{ perspective: "1000px" }}
        >
            <AnimatedBg />

            <div className={styles.errorContent404}>
                <div
                    ref={text404Ref}
                    className="flex justify-center items-center gap-4 cursor-crosshair z-20"
                    style={{ transformStyle: "preserve-3d", marginBottom: '2rem' }}
                >
                    <span className="char-404" style={{ display: "inline-block", fontSize: '8rem', fontWeight: 900, color: '#3b82f6', textShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>4</span>
                    <span className="char-404" style={{ display: "inline-block", fontSize: '8rem', fontWeight: 900, color: '#3b82f6', textShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>0</span>
                    <span className="char-404" style={{ display: "inline-block", fontSize: '8rem', fontWeight: 900, color: '#3b82f6', textShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>4</span>
                </div>

                <h1 className={styles.title404}>
                    Page Not Found
                </h1>
                <p className={styles.desc404}>
                    Sorry, the page you looking for might have been removed, had its name changed,
                    or is temporarily unavailable.
                </p>

                <div className={styles.actionGroup}>
                    <Link
                        href="/"
                        className={styles.btnPrimary}
                    >
                        <Home className={styles.btnIcon} />
                        Home
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className={styles.btnSecondary}
                    >
                        <ArrowLeft className={styles.btnIcon} />
                        Go Back
                    </button>
                </div>
            </div>
        </main>
    );
}
