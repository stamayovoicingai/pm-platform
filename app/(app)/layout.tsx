import { redirect } from "next/navigation";
import { sesionActual, cerrarSesion } from "@/lib/auth";
import { clientesSidebar } from "@/lib/consultas/clientes";
import Shell from "@/components/Shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/login");

  const clientes = await clientesSidebar();

  async function salir() {
    "use server";
    await cerrarSesion();
    redirect("/login");
  }

  return (
    <Shell
      clientes={clientes}
      usuario={sesion.nombre}
      salir={
        <form action={salir}>
          <button type="submit" className="text-xs" style={{ color: "var(--texto-3)" }}>
            Salir
          </button>
        </form>
      }
    >
      {children}
    </Shell>
  );
}
