import type { Metadata } from "next";
import { Inter, DM_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "OpenOutreach",
  description: "Multi-campaign cold-email platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmMono.variable} h-full antialiased`}>
      <body style={{ minHeight: "100vh" }} suppressHydrationWarning>
        {/* Global topbar */}
        <header style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          height: 52,
          display: "flex",
          alignItems: "center",
          padding: "0 28px",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}>
          {/* Brand gradient hairline — the signature mesh stops, sitewide */}
          <span style={{
            position: "absolute", left: 0, right: 0, bottom: -1, height: 2,
            background: "#000000",
          }} />
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 1 }}>
            <span style={{
              fontFamily: "var(--font-ui)",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text)",
              letterSpacing: "-0.02em",
            }}>
              Open
            </span>
            <span style={{
              fontFamily: "var(--font-ui)",
              fontSize: 15,
              fontWeight: 400,
              color: "var(--muted)",
              letterSpacing: "-0.01em",
            }}>
              Outreach
            </span>
            <span style={{
              marginLeft: 6,
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "var(--accent)",
              display: "inline-block",
              flexShrink: 0,
            }} />
          </a>
        </header>
        {children}
      </body>
    </html>
  );
}
