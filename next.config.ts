import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default es 1MB -- bloqueaba (con un error crudo de Next, no un
      // mensaje de la app) cualquier planificación Excel real de más de 1MB,
      // que es fácil de superar con formato/colores o varias hojas. El
      // límite real de tamaño para ese caso ya lo aplica la propia validación
      // de la app (TAMANO_MAXIMO = 10 MiB en lib/planificaciones-excel-
      // actions.ts) -- acá solo se sube el techo del framework un poco por
      // encima de eso para no chocar con el overhead de multipart/form-data.
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
