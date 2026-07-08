import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

// Body text — Inter is a clean, highly legible UI sans.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Display face for headings — Sora gives the title a bit of character without
// straying from the refined-minimal aesthetic.
const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Yearly Calendar",
  description: "A refined 4-year planning calendar — color-coded events, reminders, and cross-device sync.",
  icons: {
    icon: [{ url: "icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "Yearly Calendar",
    description: "A refined 4-year planning calendar — color-coded events, reminders, and cross-device sync.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
