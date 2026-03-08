export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen flex flex-col justify-center items-center" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {children}
        </div>
    );
}
