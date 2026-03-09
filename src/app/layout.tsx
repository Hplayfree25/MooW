import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "MooW",
  description: "Your Character Roleplay AI",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MooW",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="copyright" content="© 2026 MoowAI. All rights reserved." />
        <script
          dangerouslySetInnerHTML={{
            __html: `
/*
 * ============================================================
 *  © 2026 MoowAI — All Rights Reserved.
 *
 *  This source code is proprietary and confidential.
 *  Unauthorized copying, modification, distribution,
 *  or use of this software, via any medium, is strictly
 *  prohibited without prior written permission from MoowAI.
 *
 *  For inquiries, contact: mizae.dev
 * ============================================================
 */
`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
