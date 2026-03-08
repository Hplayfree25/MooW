import styles from "./settings.module.css";

export default function SettingsLoading() {
    return (
        <div className={styles.pageWrapper}>
            <div className={styles.container}>
                <div className="skeleton" style={{ height: '2.5rem', width: '180px', borderRadius: 'var(--radius-md)' }} />
                <div className={styles.settingsLayout}>
                    <div className={styles.settingsContent}>
                        <div className={styles.formPanel} style={{ gap: '1.5rem' }}>
                            <div className="skeleton" style={{ height: '1.75rem', width: '220px', marginBottom: '0.5rem' }} />
                            <div style={{ height: '1px', background: 'var(--border-color)', width: '100%' }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0 }} />
                                <div className="skeleton" style={{ height: '36px', width: '130px', borderRadius: 'var(--radius-md)' }} />
                            </div>
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div className="skeleton" style={{ height: '16px', width: `${100 + i * 30}px` }} />
                                    <div className="skeleton" style={{ height: '42px', width: '100%', borderRadius: 'var(--radius-md)' }} />
                                </div>
                            ))}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div className="skeleton" style={{ height: '16px', width: '200px' }} />
                                <div className="skeleton" style={{ height: '100px', width: '100%', borderRadius: 'var(--radius-md)' }} />
                            </div>

                            <div className="skeleton" style={{ height: '42px', width: '140px', borderRadius: 'var(--radius-md)', marginTop: '0.5rem' }} />
                        </div>
                    </div>

                    <div className={styles.settingsTabs}>
                        {[1, 2, 3, 4, 5].map(i => (
                            <div
                                key={i}
                                className="skeleton"
                                style={{
                                    height: '40px',
                                    width: '100%',
                                    borderRadius: 'var(--radius-md)',
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
