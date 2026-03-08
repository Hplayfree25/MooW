"use client";
import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import styles from "./ErrorPages.module.css";

const random = (min: number, max: number) => Math.random() * (max - min) + min;

export function AnimatedBg() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const ctx = gsap.context(() => {
            const shapes = gsap.utils.toArray<HTMLElement>(`.${styles.shapeNode}`);

            shapes.forEach((shape) => {
                gsap.to(shape, {
                    x: () => random(-150, 150),
                    y: () => random(-150, 150),
                    rotation: () => random(-180, 180),
                    scale: () => random(0.8, 1.5),
                    duration: () => random(10, 20),
                    ease: "sine.inOut",
                    repeat: -1,
                    yoyo: true,
                });
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <div
            ref={containerRef}
            className={styles.bgContainer}
        >
            {Array.from({ length: 12 }).map((_, i) => {
                const isCircle = i % 2 === 0;
                const hue = i % 3 === 0 ? "260" : i % 2 === 0 ? "320" : "190";
                return (
                    <div
                        key={i}
                        className={styles.shapeNode}
                        style={{
                            width: `${random(150, 350)}px`,
                            height: `${random(150, 350)}px`,
                            left: `${random(-10, 110)}%`,
                            top: `${random(-10, 110)}%`,
                            borderRadius: isCircle ? "50%" : "30px",
                            backgroundColor: `hsl(${hue}, 80%, 60%)`,
                        }}
                    />
                );
            })}
            <div className={styles.bgBackdrop} />
        </div>
    );
}
