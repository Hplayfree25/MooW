"use client";

import React from "react";
import { SearchX, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./ErrorPages.module.css";

export default function CharacterNotFound({ chrno }: { chrno: string }) {
    const router = useRouter();

    return (
        <main className={styles.mainContainer} style={{ background: "transparent" }}>
            <div className={`${styles.card} ${styles.cardPrimary}`} style={{ border: "1px solid var(--border-light)", boxShadow: "var(--shadow-sm)" }}>
                <div className={`${styles.iconContainer} ${styles.iconContainerPrimary}`} style={{ animation: "none", transform: "none", marginBottom: "1rem" }}>
                    <SearchX className={styles.icon} />
                </div>

                <h1 className={`${styles.title} ${styles.titlePrimary}`} style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>
                    Character Not Found
                </h1>

                <p className={styles.description} style={{ marginTop: 0, fontSize: "0.95rem" }}>
                    We couldn't find the character <br />
                    <span className={styles.codeTag}>
                        ID: {chrno}
                    </span>
                </p>

                <div className={styles.actionGroup} style={{ marginTop: "2rem" }}>
                    <Link
                        href="/"
                        className={`${styles.btnPrimary} ${styles.btnBtnFull}`}
                        style={{ padding: "0.6rem 1rem" }}
                    >
                        <Home className={styles.btnIcon} />
                        Discover Characters
                    </Link>

                    <button
                        onClick={() => router.back()}
                        className={`${styles.btnSecondary} ${styles.btnBtnFull}`}
                        style={{ cursor: "pointer", padding: "0.6rem 1rem" }}
                    >
                        <ArrowLeft className={styles.btnIcon} />
                        Go Back
                    </button>
                </div>
            </div>
        </main>
    );
}
