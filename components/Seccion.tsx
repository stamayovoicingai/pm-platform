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
    <section className="mb-8">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase" style={{ color: "var(--texto-2)" }}>
          {titulo}
          {contador !== undefined && (
            <span className="ml-2 font-normal" style={{ color: "var(--texto-3)" }}>
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

export function Vacio({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="tarjeta px-4 py-6 text-sm text-center"
      style={{ color: "var(--texto-3)" }}
    >
      {children}
    </div>
  );
}
