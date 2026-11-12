import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const sharedDir = path.resolve(here, "../server/src/shared");

/**
 * docs/SDK.md > ENVIRONMENTS > Local: a standalone local page sets
 * window.BLOXITY_ENV itself, injected by the dev server only (never in a
 * production build). `apply: "serve"` keeps it out of `vite build`.
 */
function bloxityLocalEnv(): Plugin {
  const localEnv = {
    env: "local",
    apiUrl: "http://localhost:4000",
    playUrl: "http://localhost:2567",
    portalUrl: "http://localhost:3000",
    staticUrl: "https://static.bloxity.io",
  };
  return {
    name: "bloxity-local-env",
    apply: "serve",
    transformIndexHtml() {
      return [
        {
          tag: "script",
          children: `window.BLOXITY_ENV = ${JSON.stringify(localEnv)};`,
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

export default defineConfig({
  plugins: [bloxityLocalEnv(), react(), tailwindcss()],
  resolve: {
    alias: { "@shared": sharedDir },
  },
  server: {
    port: 5173,
    fs: { allow: [here, sharedDir] },
  },
  build: {
    target: "es2020",
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          three: ["three"],
          r3f: ["@react-three/fiber"],
        },
      },
    },
  },
});
