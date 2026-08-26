import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { leerTema, leerIdioma, atributoTema } from "@/lib/preferencias";
import "./globals.css";

/**
 * Plex se dibujó para contextos técnicos e industriales, que es exactamente el
 * mundo de esta herramienta: telefonía, concurrencia, AHT. La mono no es
 * decorativa — le da a cada cifra el peso de una medida y hace que una columna
 * de números se lea como una columna.
 */
const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--tipo-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--tipo-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  title: "PM Platform",
  description: "Centro de control de producto de VoicingAI",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [tema, idioma] = await Promise.all([leerTema(), leerIdioma()]);

  return (
    <html
      lang={idioma}
      data-theme={atributoTema(tema)}
      className={`${sans.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
