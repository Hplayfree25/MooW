"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ShieldAlert, Settings, LogOut, ArrowLeft } from "lucide-react";
import styles from "./admin-layout.module.css";

export default function AdminSidebar() {
    const pathname = usePathname();

    const menuItems = [
        { label: "Dashboard", href: "/admin", icon: <LayoutDashboard size={20} /> },
    ];

    return (
        <aside className={styles.sidebar}>
            <div className={styles.logoArea}>
                <ShieldAlert size={28} color="var(--accent-primary)" />
                <span className={styles.brandName}>Staff Panel</span>
            </div>

            <nav className={styles.nav}>
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                <Link href="/" className={styles.backLink}>
                    <ArrowLeft size={18} />
                    <span>Back to App</span>
                </Link>
            </div>
        </aside>
    );
}
