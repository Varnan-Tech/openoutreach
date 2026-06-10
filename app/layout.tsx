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
  axes: ["opsz"],
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
      <body style={{ fontFamily: "var(--font-ui)", background: "var(--bg)", minHeight: "100vh" }}>
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
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              width: 28, height: 28, background: "var(--indigo)",
              borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#fff",
              boxShadow: "0 0 12px rgba(99,102,241,0.35)",
            }}>O</span>
            <span style={{
              fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600,
              color: "var(--text)", letterSpacing: "-0.01em",
            }}>
              Open<span style={{ color: "var(--muted)", fontWeight: 400 }}>Outreach</span>
            </span>
          </a>
        </header>
        {children}
      </body>
    </html>
  );
}
