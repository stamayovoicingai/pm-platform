import type { Metadata } from "next";
import { leerTema, leerIdioma, atributoTema } from "@/lib/preferencias";
import "./globals.css";

export const metadata: Metadata = {
  title: "PM Platform",
  description: "Centro de control de producto de VoicingAI",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [tema, idioma] = await Promise.all([leerTema(), leerIdioma()]);

  return (
    <html lang={idioma} data-theme={atributoTema(tema)}>
      <body>{children}</body>
    </html>
  );
}
