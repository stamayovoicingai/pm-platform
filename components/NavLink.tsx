"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const ruta = usePathname();
  const activo = href === "/" ? ruta === "/" : ruta.startsWith(href);

  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
      style={{
        background: activo ? "var(--acento-suave)" : "transparent",
        color: activo ? "var(--acento)" : "var(--texto-2)",
      }}
    >
      {children}
    </Link>
  );
}
