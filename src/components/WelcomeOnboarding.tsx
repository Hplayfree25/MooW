"use client";

import { useEffect, useState } from "react";
import { setupUsernameAction } from "@/app/(auth)/actions";
import { useRouter } from "next/navigation";
import css from "./WelcomeOnboarding.module.css";
import { Loader2, ArrowRight } from "lucide-react";

export default function WelcomeOnboarding() {
    const [idx, setIdx] = useState(0);
    const [name, setName] = useState("");
    const [err, setErr] = useState("");
    const [load, setLoad] = useState(false);
    const rtr = useRouter();

    const clips = [
        { t: "Welcome to the Beginning", s: "" },
        { t: "A World of Infinite Possibilities", s: "" },
        { t: "Identify Yourself", s: "Enter your persona name" },
        { t: `Initializing Persona: ${name}`, s: "" },
        { t: "Identity Confirmed", s: "" },
        { t: "Demo: Interact with Characters", s: "Experience dynamic conversations" },
        { t: "Demo: Experience the Stories", s: "Immerse yourself in new worlds" },
        { t: "Tutorial: Swipe and Navigate", s: "Tap to connect and explore" },
        { t: "This is still Alpha phase beta", s: "Ready to enter?" }
    ];

    useEffect(() => {
        if (idx === 2 || idx === 8) return;

        const tmr = setTimeout(() => {
            setIdx(p => p + 1);
        }, 4500);

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

            <div className={css.top} />
            <div className={css.bot} />

            <div key={idx} className={idx === 2 || idx === 8 ? css.stay : css.anim}>
                <h1 className={css.ti}>{clips[idx].t}</h1>
                {clips[idx].s && <p className={css.sub}>{clips[idx].s}</p>}

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
