import { contactosCliente } from "@/lib/consultas/contactos";
import { crearContacto, borrarContacto, editarContacto } from "@/app/acciones";
import BotonBorrar from "@/components/BotonBorrar";
import Pastilla from "@/components/Pastilla";
import { Vacio } from "@/components/Seccion";
import { LADOS, ETIQUETA_LADO } from "@/lib/dominio";

import { crearTraductor } from "@/lib/i18n";
import { leerIdioma } from "@/lib/preferencias";
import Modal, { FormularioModal } from "@/components/Modal";
export const dynamic = "force-dynamic";

export default async function ContactosCliente({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = crearTraductor(await leerIdioma());
  const { id } = await params;
  const contactos = await contactosCliente(id);

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="titulo-seccion">{t("Contactos")}</h2>
        <Modal
          etiqueta={t("Añadir contacto")}
          titulo={t("Añadir contacto")}
          descripcion={t("Quién aprueba, quién bloquea, quién decide.")}
          variante="principal"
        >
          <FormularioModal accion={crearContacto}>
          <input type="hidden" name="cliente_id" value={id} />
          <div className="grid sm:grid-cols-4 gap-3">
            <div>
              <label className="etiqueta">{t("Nombre")}</label>
              <input name="nombre" required className="campo" />
            </div>
            <div>
              <label className="etiqueta">{t("Rol")}</label>
              <input name="rol" className="campo" placeholder={t("Aprueba el guion")} />
            </div>
            <div>
              <label className="etiqueta">{t("Lado")}</label>
              <select name="lado" className="campo" defaultValue="cliente">
                {LADOS.map((l) => (
                  <option key={l} value={l}>
                    {t(ETIQUETA_LADO[l])}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="etiqueta">{t("Email")}</label>
              <input name="email" type="email" className="campo" />
            </div>
          </div>
          <button type="submit" className="boton">{t("Añadir contacto")}</button>
        </FormularioModal>
        </Modal>
      </div>


      {contactos.length === 0 ? (
        <Vacio icono="equipo">
          {t("Sin contactos. Sirven para asignar responsables a los compromisos.")}
        </Vacio>
      ) : (
        <div className="tarjeta divide-y" style={{ borderColor: "var(--borde)" }}>
          {contactos.map((c) => (
            <div key={c.id} className="px-4 py-3" style={{ borderColor: "var(--borde)" }}>
              <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{c.nombre}</span>
                  <Pastilla>{t(ETIQUETA_LADO[c.lado])}</Pastilla>
                </div>
                <p className="text-xs mt-0.5" style={{ color: "var(--texto-3)" }}>
                  {[c.rol, c.email].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              </div>

              <details className="mt-2">
                <summary
                  className="text-xs cursor-pointer select-none"
                  style={{ color: "var(--texto-3)" }}
                >
                  {t("Editar")}
                </summary>

                <form action={editarContacto} className="mt-2 space-y-2">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="cliente_id" value={id} />
                  <div className="grid sm:grid-cols-[1fr_1fr_8rem_1fr_auto] gap-2 items-end">
                    <div>
                      <label className="etiqueta">{t("Nombre")}</label>
                      <input name="nombre" required defaultValue={c.nombre} className="campo" />
                    </div>
                    <div>
                      <label className="etiqueta">{t("Rol")}</label>
                      <input name="rol" defaultValue={c.rol ?? ""} className="campo" />
                    </div>
                    <div>
                      <label className="etiqueta">{t("Lado")}</label>
                      <select name="lado" className="campo" defaultValue={c.lado}>
                        {LADOS.map((l) => (
                          <option key={l} value={l}>
                            {t(ETIQUETA_LADO[l])}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="etiqueta">{t("Email")}</label>
                      <input name="email" type="email" defaultValue={c.email ?? ""} className="campo" />
                    </div>
                    <button type="submit" className="boton">
                      {t("Guardar")}
                    </button>
                  </div>
                </form>

                <form action={borrarContacto} className="mt-2">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="cliente_id" value={id} />
                  <BotonBorrar etiqueta={t("Quitar contacto")} confirmacion={t("Confirmar borrado")} />
                </form>
              </details>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
