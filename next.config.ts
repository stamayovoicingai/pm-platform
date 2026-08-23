import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const config: NextConfig = {
  // Genera un build autocontenido para el contenedor de Easypanel.
  output: "standalone",
  serverExternalPackages: ["pg", "bcryptjs"],
  // Sin esto Turbopack sube hasta el home buscando el lockfile.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
};

export default config;
