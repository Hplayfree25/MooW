export default function ChatLayout({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
            {children}
        </div>
    );
}
