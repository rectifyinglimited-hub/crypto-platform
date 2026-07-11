import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Nexus dev server — proxy /api to backend on 5001.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    host: "0.0.0.0", // listen on all interfaces so LAN devices can connect
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
});
