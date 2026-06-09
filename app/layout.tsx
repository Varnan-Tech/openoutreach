import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "OpenOutreach",
  description: "Multi-campaign cold-email platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body
        className="min-h-full bg-slate-50"
        style={{ fontFamily: "var(--font-outfit, system-ui, sans-serif)" }}
      >
        {children}
      </body>
    </html>
  );
}
