import { sesionActual } from "@/lib/auth";
import FormularioPassword from "@/components/FormularioPassword";

export const dynamic = "force-dynamic";

export default async function Perfil() {
  const sesion = await sesionActual();

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Cuenta</h1>
      <p className="text-sm mb-6" style={{ color: "var(--texto-2)" }}>
        {sesion?.nombre} · {sesion?.email}
      </p>

      <FormularioPassword />
    </div>
  );
}
