import { resumenMensual, objetivosCliente, mesesCargados } from "@/lib/consultas/metricas";
import { lineaBaseCliente } from "@/lib/consultas/lineaBase";
import ResumenMetricas from "@/components/ResumenMetricas";
import LineaBaseCard from "@/components/LineaBaseCard";

export const dynamic = "force-dynamic";

export default async function MetricasCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [resumen, objetivos, meses, base] = await Promise.all([
    resumenMensual(id),
    objetivosCliente(id),
    mesesCargados(id),
    lineaBaseCliente(id),
  ]);

  return (
    <>
      <LineaBaseCard clienteId={id} base={base} mes={resumen[0] ?? null} />
      <ResumenMetricas
        clienteId={id}
        resumen={resumen}
        objetivos={objetivos}
        meses={meses}
      />
    </>
  );
}
