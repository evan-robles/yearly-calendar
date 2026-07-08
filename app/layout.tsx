import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yearly Calendar",
  description: "4-year planning calendar with color-coded events.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-50 text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
