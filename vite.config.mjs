import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function resolveManualChunk(id) {
  if (!id.includes("node_modules")) {
    return undefined;
  }

  if (
    id.includes("/react/") ||
    id.includes("/react-dom/") ||
    id.includes("/scheduler/")
  ) {
    return "react-vendor";
  }

  if (id.includes("/react-router") || id.includes("/@remix-run/")) {
    return "router-vendor";
  }

  if (id.includes("/@tanstack/react-query/")) {
    return "query-vendor";
  }

  if (id.includes("/framer-motion/")) {
    return "motion-vendor";
  }

  if (id.includes("/recharts/") || id.includes("/d3-")) {
    return "charts-vendor";
  }

  if (id.includes("/lucide-react/")) {
    return "icons-vendor";
  }

  if (id.includes("/jspdf-autotable/")) {
    return "export-autotable";
  }

  if (id.includes("/html2canvas/")) {
    return "export-canvas";
  }

  if (id.includes("/jspdf/")) {
    return "export-pdf";
  }

  return "vendor";
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:5000";

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 3000,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "build",
      rollupOptions: {
        output: {
          manualChunks: resolveManualChunk,
        },
      },
    },
  };
});
