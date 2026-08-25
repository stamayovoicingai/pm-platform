import "server-only";
import { uno } from "../db";

export type LineaBase = {
  id: string;
  volumen_mensual_promedio: number | null;
  aht_promedio_seg: number | null;
  concurrencia_promedio: number | null;
  concurrencia_maxima: number | null;
  meta_contencion_pct: string | null;
  horario_operativo: string | null;
  entregado_por: string | null;
  fecha_entrega: string | null;
  notas: string | null;
};

export async function lineaBaseCliente(clienteId: string) {
  return uno<LineaBase>("select * from linea_base where id = $1", [clienteId]);
}
