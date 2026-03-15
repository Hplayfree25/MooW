"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, MessageCircle, PlusCircle, Plus, Settings, LogOut, Bell } from "lucide-react";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./sidebar.module.css";
import { Logo } from "@/components/Logo";

function SidebarToggleIcon({ isCollapsed, isHovered }: { isCollapsed: boolean; isHovered: boolean }) {
    return (
        <motion.svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
            <motion.line
                y1="3"
                y2="21"
                initial={false}
                animate={{
                    x1: isCollapsed ? 9 : 15,
                    x2: isCollapsed ? 9 : 15,
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
            />
            <motion.path
                initial={false}
                animate={{
                    d: isCollapsed
                        ? "M 13 9 L 16 12 L 13 15"
                        : "M 11 9 L 8 12 L 11 15",
                    translateX: isHovered ? (isCollapsed ? 2 : -2) : 0,
                }}
                transition={{ duration: 0.35, ease: "easeOut" }}
            />
        </motion.svg>
    );
}

function SidebarLogoutIcon({ isHovered }: { isHovered: boolean }) {
    return (
        <motion.svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />

            <motion.path
                d="M16 17l5-5-5-5"
                animate={{ x: isHovered ? 2 : 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
            <motion.line
                x1="9" y1="12" x2="21" y2="12"
                animate={{ x2: isHovered ? 23 : 21, x1: isHovered ? 11 : 9 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
        </motion.svg>
    )
}

const sidebarTransition = { duration: 0.45, ease: "easeInOut" as const };

const sidebarVariants = {
    expanded: { width: "260px", transition: sidebarTransition },
    collapsed: { width: "80px", transition: sidebarTransition },
};

export default function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isToggleHovered, setIsToggleHovered] = useState(false);
    const [isLogoutHovered, setIsLogoutHovered] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const storedState = localStorage.getItem("sidebarCollapsed");
        if (storedState !== null) {
            setIsCollapsed(JSON.parse(storedState));
        }

        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setIsMobile(true);
            } else {
                setIsMobile(false);
                setIsMobileOpen(false);
            }
        };

        handleResize();
        setMounted(true);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (isMobile) setIsMobileOpen(false);
    }, [pathname, isMobile]);

    const links = [
        { href: "/", icon: <Compass size={24} />, name: "Explore", preview: "Find Characters", exact: true },
        { href: "/chats", icon: <MessageCircle size={20} />, name: "Chats", preview: "Recent Conversation", match: "/chat" },
        { href: "/notifications", icon: <Bell size={20} />, name: "Notifications", preview: "Updates & Alerts", match: "/notifications" },
        { href: "/create", icon: <PlusCircle size={20} />, name: "Create", preview: "New Character", exact: true },
    ];

    if (!mounted) {
        return (
            <>
                <aside className={styles.sidebarContainer} style={{ width: '260px' }}>
                    <div className={styles.skeletonLogo}>
                        <div className={`${styles.skeleton} ${styles.skeletonIcon}`} />
                    </div>
                    <div className={styles.sidebarContent}>
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className={styles.skeletonNavItem}>
                                <div className={`${styles.skeleton} ${styles.skeletonIcon}`} />
                                <div className={styles.skeletonTextGroup}>
                                    <div className={`${styles.skeleton} ${styles.skeletonTextLong}`} />
                                    <div className={`${styles.skeleton} ${styles.skeletonTextShort}`} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className={styles.skeletonFooter}>
                        <div className={`${styles.skeleton} ${styles.skeletonFooterBtn}`} />
                        <div className={`${styles.skeleton} ${styles.skeletonFooterBtn}`} />
                        <div className={`${styles.skeleton} ${styles.skeletonFooterBtn}`} />
                    </div>
                </aside>
            </>
        );
    }

    if (isMobile) {
        return (
            <nav className={styles.bottomNav}>
                <Link href="/" className={`${styles.bottomNavItem} ${pathname === "/" ? styles.bottomNavItemActive : ""}`}>
                    <Compass size={24} />
                    <span className={styles.bottomNavLabel}>Explore</span>
                </Link>

                <Link href="/chats" className={`${styles.bottomNavItem} ${pathname.startsWith("/chat") ? styles.bottomNavItemActive : ""}`}>
                    <MessageCircle size={24} />
                    <span className={styles.bottomNavLabel}>Chat</span>
                </Link>

                <div className={styles.catFabWrapper}>
                    <Link href="/create" className={styles.catFab}>
                        <Plus size={24} color="var(--accent-primary)" />
                        <span className={styles.bottomNavLabel}>Create</span>
                    </Link>
                </div>

                <Link href="/notifications" className={`${styles.bottomNavItem} ${pathname.startsWith("/notifications") ? styles.bottomNavItemActive : ""}`}>
                    <Bell size={24} />
                    <span className={styles.bottomNavLabel}>Alerts</span>
                </Link>

                <Link href="/settings" className={`${styles.bottomNavItem} ${pathname === "/settings" ? styles.bottomNavItemActive : ""}`}>
                    <Settings size={24} />
                    <span className={styles.bottomNavLabel}>Settings</span>
                </Link>
            </nav>
        );
    }

    return (
        <motion.aside
            className={`${styles.sidebarContainer} ${isCollapsed ? styles.sidebarCollapsed : ''}`}
            variants={sidebarVariants}
            initial={false}
            animate={isCollapsed ? "collapsed" : "expanded"}
            suppressHydrationWarning
        >
            <div className={styles.sidebarHeader}>
                <Logo
                    width={isCollapsed ? 32 : 40}
                    height={isCollapsed ? 32 : 40}
                    style={{ transition: "all 0.45s ease-in-out", color: "var(--text-primary)" }}
                />
            </div>

            <div className={styles.sidebarContent}>
                {links.map((link) => {
                    const isActive = link.exact
                        ? pathname === link.href
                        : pathname.startsWith(link.match || "");
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                        >
                            <div className={styles.navItemIcon}>{link.icon}</div>
                            <AnimatePresence>
                                {!isCollapsed && (
                                    <motion.div
                                        className={styles.navItemInfo}
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: "auto" }}
                                        exit={{ opacity: 0, width: 0 }}
                                        transition={{ duration: 0.35, ease: "easeInOut" }}
                                        style={{ whiteSpace: "nowrap", overflow: "hidden" }}
                                    >
                                        <h3 className={styles.navItemName}>{link.name}</h3>
                                        <p className={styles.navItemPreview}>{link.preview}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Link>
                    );
                })}
            </div>

            <div className={styles.sidebarFooter} style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', padding: isCollapsed ? '1rem 0' : '1rem' }}>
                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Link href="/settings" className={styles.footerActionBtn} title="Settings">
                                <Settings size={22} />
                            </Link>
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    className={styles.toggleBtn}
                    onClick={() => {
                        const newState = !isCollapsed;
                        setIsCollapsed(newState);
                        localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
                    }}
                    onMouseEnter={() => setIsToggleHovered(true)}
                    onMouseLeave={() => setIsToggleHovered(false)}
                    style={{ margin: isCollapsed ? '0 auto' : '0' }}
                >
                    <SidebarToggleIcon isCollapsed={isCollapsed} isHovered={isToggleHovered} />
                </button>

                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.3 }}
                        >
                            <button
                                onClick={() => signOut({ callbackUrl: "/login" })}
                                className={`${styles.footerActionBtn} ${styles.logout}`}
                                title="Log Out"
                                onMouseEnter={() => setIsLogoutHovered(true)}
                                onMouseLeave={() => setIsLogoutHovered(false)}
                            >
                                <SidebarLogoutIcon isHovered={isLogoutHovered} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.aside>
    );
}
