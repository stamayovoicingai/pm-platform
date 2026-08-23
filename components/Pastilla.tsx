export default function Pastilla({
  children,
  fondo = "var(--superficie-2)",
  texto = "var(--texto-2)",
  titulo,
}: {
  children: React.ReactNode;
  fondo?: string;
  texto?: string;
  titulo?: string;
}) {
  return (
    <span className="pastilla" style={{ background: fondo, color: texto }} title={titulo}>
      {children}
    </span>
  );
}
