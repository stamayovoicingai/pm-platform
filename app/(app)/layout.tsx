import Link from "next/link";
import { redirect } from "next/navigation";
import { sesionActual, cerrarSesion } from "@/lib/auth";
import NavLink from "@/components/NavLink";

export const dynamic = "force-dynamic";

const RUTAS = [
  { href: "/", etiqueta: "Hoy" },
  { href: "/clientes", etiqueta: "Clientes" },
  { href: "/metricas", etiqueta: "Métricas" },
  { href: "/hitos", etiqueta: "Hitos" },
  { href: "/compromisos", etiqueta: "Compromisos" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");

  async function salir() {
    "use server";
    await cerrarSesion();
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-20 backdrop-blur"
        style={{
          background: "color-mix(in srgb, var(--fondo) 88%, transparent)",
          borderBottom: "1px solid var(--borde)",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14 gap-4">
            <Link href="/" className="font-semibold tracking-tight shrink-0">
              PM Platform
            </Link>

            <nav className="flex items-center gap-1 overflow-x-auto">
              {RUTAS.map((ruta) => (
                <NavLink key={ruta.href} href={ruta.href}>
                  {ruta.etiqueta}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/perfil"
                className="text-xs"
                style={{ color: "var(--texto-3)" }}
                title={sesion.email}
              >
                Cuenta
              </Link>
              <form action={salir}>
                <button type="submit" className="text-xs" style={{ color: "var(--texto-3)" }}>
                  Salir
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
