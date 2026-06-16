import type { Metadata } from "next";
import { Outfit, Fraunces, DM_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
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
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} ${dmMono.variable} h-full antialiased`}>
      <body style={{ minHeight: "100vh" }}>
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
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 0 }}>
            <span style={{
              fontFamily: "var(--font-display)",
              fontSize: 17,
              fontWeight: 400,
              color: "var(--text)",
              letterSpacing: "-0.01em",
            }}>
              Open
            </span>
            <span style={{
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--muted)",
              letterSpacing: "0.01em",
            }}>
              Outreach
            </span>
            <span style={{
              marginLeft: 8,
              width: 5,
              height: 5,
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
