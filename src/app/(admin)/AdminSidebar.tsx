"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ShieldAlert, Settings, ArrowLeft, Flag, Menu, X } from "lucide-react";
import styles from "./admin-layout.module.css";

const menuItems = [
    { label: "Dashboard", href: "/admin", icon: <LayoutDashboard size={20} /> },
    { label: "Users", href: "/admin/users", icon: <Users size={20} /> },
    { label: "Reports", href: "/admin/reports", icon: <Flag size={20} /> },
    { label: "Audit Logs", href: "/admin/logs", icon: <ShieldAlert size={20} /> },
    { label: "Settings", href: "/admin/settings", icon: <Settings size={20} /> },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const toggleSidebar = () => setIsOpen(!isOpen);

    return (
        <>
            <div className={styles.mobileHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ShieldAlert size={24} color="var(--accent-primary)" />
                    <span className={styles.brandName}>Staff Panel</span>
                </div>
                <button className={styles.menuBtn} onClick={toggleSidebar}>
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            <div className={`${styles.overlay} ${isOpen ? styles.open : ""}`} onClick={toggleSidebar} />

            <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
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
                                onClick={() => setIsOpen(false)}
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
        </>
    );
}
