import styles from "../profile.module.css";
import { LayoutGrid, Award, CalendarDays, Check } from "lucide-react";

export default function ProfileSkeleton() {
    return (
        <div className={styles.container}>
            <div className={styles.banner} style={{ backgroundColor: "var(--bg-tertiary)", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />

            <div className={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className={styles.pfpWrap} style={{ marginTop: 0 }}>
                        <div className={styles.pfp} style={{ backgroundColor: "var(--bg-tertiary)", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                    </div>
                </div>

                <div className={styles.info}>
                    <div className={styles.unameWrap}>
                        <div style={{ width: 140, height: 28, backgroundColor: "var(--bg-tertiary)", borderRadius: 6, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                    </div>

                    <div className={styles.meta} style={{ marginTop: '0.75rem' }}>
                        <div className={styles.metaItem}>
                            <div style={{ width: 120, height: 16, backgroundColor: "var(--bg-tertiary)", borderRadius: 4, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                        </div>
                    </div>

                    <div className={styles.stats}>
                        <div className={styles.statItem}>
                            <div style={{ width: 100, height: 20, backgroundColor: "var(--bg-tertiary)", borderRadius: 4, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                        </div>
                    </div>

                    <div className={styles.bio} style={{ marginTop: '1rem' }}>
                        <div style={{ width: "80%", height: 16, backgroundColor: "var(--bg-tertiary)", borderRadius: 4, marginBottom: 8, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                        <div style={{ width: "60%", height: 16, backgroundColor: "var(--bg-tertiary)", borderRadius: 4, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                    </div>
                </div>
            </div>

            <div className={styles.content}>
                <div className={styles.tabs}>
                    <button className={`${styles.tabBtn} ${styles.tabActive}`}>
                        Characters
                    </button>
                    <button className={styles.tabBtn}>
                        Badge Collection
                    </button>
                </div>

                <div className={styles.gridContent}>
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={styles.cardItem} style={{ border: 'none' }}>
                            <div style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: "var(--bg-tertiary)", animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                            <div style={{ width: "80%", height: 16, backgroundColor: "var(--bg-tertiary)", borderRadius: 4, marginTop: 12, animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
                        </div>
                    ))}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                }
            `}} />
        </div>
    );
}
