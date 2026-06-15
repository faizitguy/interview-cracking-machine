import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const BACKEND = "http://localhost:4317";

// The UI talks to the local backend bridge through these proxied paths so the
// app and server share an origin in dev.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5317,
    proxy: {
      "/api": BACKEND,
      "/ask": BACKEND,
      "/watch": { target: BACKEND, ws: true },
    },
  },
});
