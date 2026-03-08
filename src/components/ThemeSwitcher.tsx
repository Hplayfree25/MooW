"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";

export function ThemeSwitcher() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div style={{ width: 80, height: 40, borderRadius: 30, background: 'var(--bg-tertiary)' }} />;
    }

    const isDark = resolvedTheme === "dark";

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`theme-toggle-btn ${isDark ? 'dark' : ''}`}
            aria-label="Toggle Theme"
            style={{
                position: 'relative',
                width: '80px',
                height: '40px',
                flexShrink: 0,
                borderRadius: '30px',
                backgroundColor: isDark ? '#1a1a2e' : '#f0f0f0',
                border: `1px solid ${isDark ? '#2a2a40' : '#e0e0e0'}`,
                display: 'flex',
                alignItems: 'center',
                padding: '0 5px',
                cursor: 'pointer',
                transition: 'background-color 0.4s ease',
            }}
        >
            <motion.div
                initial={false}
                animate={{
                    x: isDark ? 38 : 0,
                    backgroundColor: isDark ? '#2d2d44' : '#ffffff',
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    zIndex: 1
                }}
            >
                {isDark ? (
                    <Moon size={16} color="#e2e8f0" />
                ) : (
                    <Sun size={16} color="#f59e0b" />
                )}
            </motion.div>

            <div style={{ position: 'absolute', right: '12px', zIndex: 0, opacity: isDark ? 0 : 0.5 }}>
                <Moon size={14} color="#a1a1aa" />
            </div>
            <div style={{ position: 'absolute', left: '12px', zIndex: 0, opacity: isDark ? 0.5 : 0 }}>
                <Sun size={14} color="#a1a1aa" />
            </div>
        </button>
    );
}
