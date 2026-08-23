import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PM Platform",
  description: "Centro de control de producto de VoicingAI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
