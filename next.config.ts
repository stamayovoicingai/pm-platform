import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const config: NextConfig = {
  // Genera un build autocontenido para el contenedor de Easypanel.
  output: "standalone",
  serverExternalPackages: ["pg", "bcryptjs"],
  // Sin esto Turbopack sube hasta el home buscando el lockfile.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
  experimental: {
    // Los server actions vienen limitados a 1 MB. Los adjuntos son 10 MB por
    // archivo y hasta 3 por envío, más el resto del formulario.
    serverActions: { bodySizeLimit: "32mb" },
  },
};

export default config;
