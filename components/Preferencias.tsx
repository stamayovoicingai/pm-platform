import { cambiarTema, cambiarIdioma } from "@/app/acciones";
import { crearTraductor } from "@/lib/i18n";
import { leerTema, leerIdioma, TEMAS, IDIOMAS, type Tema, type Idioma } from "@/lib/preferencias";

const NOMBRE_TEMA: Record<Tema, string> = {
  sistema: "Según el sistema",
  claro: "Claro",
  oscuro: "Oscuro",
};

const NOMBRE_IDIOMA: Record<Idioma, string> = {
  es: "Español",
  en: "English",
};

/** Un grupo de botones que envían al pulsarse: sin guardar, sin desplegable. */
function Opciones<T extends string>({
  valores,
  actual,
  nombres,
  campo,
  accion,
}: {
  valores: readonly T[];
  actual: T;
  nombres: Record<T, string>;
  campo: string;
  accion: (datos: FormData) => Promise<void>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {valores.map((valor) => {
        const activo = valor === actual;
        return (
          <form key={valor} action={accion}>
            <input type="hidden" name={campo} value={valor} />
            <button
              type="submit"
              className="pastilla"
              style={{
                background: activo ? "var(--acento-suave)" : "var(--superficie)",
                color: activo ? "var(--acento)" : "var(--texto-2)",
                border: "1px solid var(--borde)",
                padding: "0.3rem 0.7rem",
              }}
            >
              {nombres[valor]}
            </button>
          </form>
        );
      })}
    </div>
  );
}

export default async function Preferencias() {
  const [tema, idioma] = await Promise.all([leerTema(), leerIdioma()]);
  const t = crearTraductor(idioma);

  return (
    <div className="tarjeta p-5 space-y-5">
      <div>
        <h2 className="text-sm font-semibold mb-2">{t("Tema")}</h2>
        <Opciones
          valores={TEMAS}
          actual={tema}
          nombres={NOMBRE_TEMA}
          campo="tema"
          accion={cambiarTema}
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-2">{t("Idioma")}</h2>
        <Opciones
          valores={IDIOMAS}
          actual={idioma}
          nombres={NOMBRE_IDIOMA}
          campo="idioma"
          accion={cambiarIdioma}
        />
        <p className="text-xs mt-2" style={{ color: "var(--texto-3)" }}>
          {t(
            "En inglés, lo que escribes se traduce automáticamente y la traducción queda guardada.",
          )}
        </p>
      </div>
    </div>
  );
}
