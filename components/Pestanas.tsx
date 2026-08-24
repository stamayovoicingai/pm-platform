"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Pestana = { href: string; etiqueta: string; contador?: number };

export default function Pestanas({ pestanas }: { pestanas: Pestana[] }) {
  const ruta = usePathname();

  return (
    <nav
      className="flex gap-1 overflow-x-auto -mb-px"
      style={{ borderBottom: "1px solid var(--borde)" }}
    >
      {pestanas.map((p) => {
        const activo = ruta === p.href;
        return (
          <Link
            key={p.href}
            href={p.href}
            className="px-3 py-2 text-sm whitespace-nowrap transition-colors"
            style={{
              color: activo ? "var(--texto)" : "var(--texto-2)",
              fontWeight: activo ? 600 : 400,
              borderBottom: `2px solid ${activo ? "var(--acento)" : "transparent"}`,
            }}
          >
            {p.etiqueta}
            {p.contador !== undefined && p.contador > 0 && (
              <span className="ml-1.5 text-xs" style={{ color: "var(--texto-3)" }}>
                {p.contador}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
