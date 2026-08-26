import Link from "next/link";
import Icono, { type NombreIcono } from "./Icono";

export function Seccion({
  titulo,
  contador,
  accion,
  children,
}: {
  titulo: string;
  contador?: number;
  accion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-7">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <h2 className="titulo-seccion flex items-baseline gap-2">
          {titulo}
          {contador !== undefined && contador > 0 && (
            <span className="num text-xs" style={{ color: "var(--texto-3)" }}>
              {contador}
            </span>
          )}
        </h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

/**
 * Un estado vacío es una invitación a hacer algo, no un cartel de "no hay
 * nada". Cuando se le pasa una acción, la ofrece ahí mismo en lugar de dejar
 * que el usuario adivine dónde estaba.
 */
export function Vacio({
  children,
  icono = "vacio",
  accion,
}: {
  children: React.ReactNode;
  icono?: NombreIcono;
  accion?: { href: string; etiqueta: string };
}) {
  return (
    <div className="tarjeta px-4 py-8 text-center">
      <span
        className="inline-flex mb-2.5"
        style={{ color: "var(--texto-3)", opacity: 0.7 }}
      >
        <Icono nombre={icono} tam={20} />
      </span>
      <p className="text-sm" style={{ color: "var(--texto-2)" }}>
        {children}
      </p>
      {accion && (
        <Link href={accion.href} className="boton mt-3 inline-flex">
          <Icono nombre="mas" tam={13} />
          {accion.etiqueta}
        </Link>
      )}
    </div>
  );
}
