"use client";

import { useEffect, useState } from "react";
import { setupUsernameAction } from "@/app/(auth)/actions";
import { useRouter } from "next/navigation";
import css from "./WelcomeOnboarding.module.css";
import { Loader2, ArrowRight } from "lucide-react";
import { WelcomeTipIcon, getRandomTip, StreamingText } from "./WelcomeTips";

export default function WelcomeOnboarding() {
    const [idx, setIdx] = useState(0);
    const [name, setName] = useState("");
    const [err, setErr] = useState("");
    const [load, setLoad] = useState(false);
    const [showAi, setShowAi] = useState(false);
    const [tip, setTip] = useState<any>(null);
    const rtr = useRouter();

    useEffect(() => {
        setTip(getRandomTip());
    }, []);

    const clips = [
        { t: "Welcome to the Beginning", s: "" },
        { t: "A World of Infinite Possibilities", s: "" },
        { t: "Identify Yourself", s: "Enter your persona name" },
        { t: `Initializing Persona: ${name}`, s: "" },
        { t: "Identity Confirmed", s: "" },
        { t: "Demo: Interact with Characters", s: "Experience dynamic conversations" },
        { t: "Demo: Experience the Stories", s: "Immerse yourself in new worlds" },
        { t: tip?.t || "Did you know?", s: tip?.s || "Here is a useful tip" },
        { t: "This is still Alpha phase beta", s: "Ready to enter?" }
    ];

    useEffect(() => {
        if (idx === 2 || idx === 8) return;

        if (idx === 5) {
            setShowAi(false);
            const t = setTimeout(() => setShowAi(true), 1200);
            const tmr = setTimeout(() => setIdx(p => p + 1), 5500);
            return () => { clearTimeout(t); clearTimeout(tmr); };
        }

        const tmr = setTimeout(() => {
            setIdx(p => p + 1);
        }, 3200);

        return () => clearTimeout(tmr);
    }, [idx]);

    const onNxt = () => {
        if (idx === 2 && !name.trim()) return;
        setIdx(p => p + 1);
    };

    const onFin = async () => {
        if (!name.trim()) return;
        setLoad(true);
        setErr("");

        const res = await setupUsernameAction(name.trim());
        if (res.success) {
            rtr.refresh();
        } else {
            setErr(res.error || "Failed");
            setLoad(false);
        }
    };

    return (
        <div className={css.wrap}>
            <div className={css.bg} />
            <div className={css.g1} />
            <div className={css.g2} />
            <div className={css.nz} />

            <div className={css.demoBox}>
                {idx === 5 && (
                    <div className={css.stream}>
                        <div className={`${css.msg} ${css.uMsg}`}>Who are you?</div>
                        {!showAi && (
                            <div className={css.aMsgWrap}>
                                <div className={css.aAvatar}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                        <path d="M12 2a10 10 0 1 0 10 10H12V2zM21.18 8.02c-1-2.34-2.82-4.16-5.16-5.16L12 12V2.05a10 10 0 0 1 9.18 5.97z" />
                                    </svg>
                                </div>
                                <div className={`${css.msg} ${css.aMsg} ${css.typing}`} style={{ width: '50px', height: '24px' }} />
                            </div>
                        )}
                        {showAi && (
                            <div className={css.aMsgWrap}>
                                <div className={css.aAvatar}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                        <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 8a8 8 0 1 0 0 16 8 8 0 0 0 0-16z" />
                                        <circle cx="12" cy="18" r="3" fill="white" />
                                    </svg>
                                </div>
                                <div className={`${css.msg} ${css.aMsg}`}>
                                    <StreamingText text="I am your digital companion. I am here to explore the infinite possibilities of storytelling with you." speed={15} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {idx === 6 && (
                    <div className={css.ux}>
                        <div className={css.card}>
                            <svg className={css.imgPlaceholder} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <polyline points="21 15 16 10 5 21" />
                            </svg>
                            <div className={css.cardLines}>
                                <div className={css.cardLine} />
                                <div className={css.cardLine} style={{ width: '60%' }} />
                            </div>
                        </div>
                        <div className={css.char}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '30px', height: '30px' }}>
                                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        </div>
                        <svg className={css.cursor} viewBox="0 0 24 24" fill="#fff" stroke="#000" strokeWidth="1.5">
                            <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.83-4.83 2.87 6.43c.13.3.43.48.73.48.11 0 .22-.02.33-.07l2.25-1c.4-.18.58-.65.4-1.05l-2.85-6.38h6.42c.31 0 .47-.38.25-.59L6.35 2.86c-.32-.32-.85-.1-.85.35z" />
                        </svg>
                    </div>
                )}
                {idx === 7 && (
                    <WelcomeTipIcon tip={tip} />
                )}
            </div>

            <div className={css.top} />
            <div className={css.bot} />

            <div key={idx} className={idx === 2 || idx === 8 ? css.stay : css.anim}>
                <h1 className={css.ti}>{clips[idx]?.t}</h1>
                {clips[idx]?.s && <p className={css.sub}>{clips[idx].s}</p>}

                {idx === 2 && (
                    <div className={css.inW}>
                        <input
                            type="text"
                            className={css.in}
                            placeholder="Your Name..."
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && onNxt()}
                            autoFocus
                            maxLength={44}
                        />
                        <button className={css.btn} onClick={onNxt} disabled={!name.trim()}>
                            <ArrowRight size={24} />
                        </button>
                    </div>
                )}

                {idx === 8 && (
                    <div className={css.finW}>
                        {err && <p className={css.err}>{err}</p>}
                        <button className={css.finBtn} onClick={onFin} disabled={load}>
                            {load ? <Loader2 size={24} className="animate-spin" /> : "Enter"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
