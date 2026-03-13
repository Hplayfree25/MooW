"use client";

import { useEffect, useState } from "react";
import css from "./WelcomeOnboarding.module.css";

export const tipsData = [
    {
        t: "Tip: Persona Customization",
        s: "Express yourself with a unique persona.",
        svg: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={css.tipIcon}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
            </svg>
        )
    },
    {
        t: "Tip: Deep Conversations",
        s: "Our AI adapts to your conversational style.",
        svg: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={css.tipIcon}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        )
    },
    {
        t: "Tip: Explore Worlds",
        s: "Discover new interactive scenarios and stories.",
        svg: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={css.tipIcon}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
        )
    },
    {
        t: "Tip: Privacy First",
        s: "Your chats are secure and strictly private.",
        svg: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={css.tipIcon}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
        )
    }
];

export function getRandomTip() {
    return tipsData[Math.floor(Math.random() * tipsData.length)];
}

export function WelcomeTipIcon({ tip }: { tip: typeof tipsData[0] }) {
    if (!tip) return null;
    return (
        <div className={css.tipContainer}>
            <div className={css.tipWrap}>
                {tip.svg}
            </div>
        </div>
    );
}

export function StreamingText({ text, speed = 30 }: { text: string, speed?: number }) {
    const [display, setDisplay] = useState("");
    
    useEffect(() => {
        let i = 0;
        setDisplay("");
        const interval = setInterval(() => {
            setDisplay(text.slice(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(interval);
        }, speed);
        
        return () => clearInterval(interval);
    }, [text, speed]);
    
    return (
        <span>
            {display}
            {display.length < text.length && <span className={css.cursorBlink}>|</span>}
        </span>
    );
}
