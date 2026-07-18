import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Production builds: no source maps, terser minify, hashed asset names.
// Note: browser JS can never be fully secret — keep the GitHub repo PRIVATE.
export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: false,
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: "http://localhost:5001",
          changeOrigin: true,
        },
      },
    },
    build: {
      sourcemap: false,
      minify: "terser",
      cssMinify: true,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 900,
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          passes: 2,
          pure_funcs: ["console.log", "console.info", "console.debug"],
        },
        mangle: {
          safari10: true,
        },
        format: {
          comments: false,
        },
      },
      rollupOptions: {
        output: {
          // Hashed filenames — harder to track/diff across deploys
          entryFileNames: "assets/[hash].js",
          chunkFileNames: "assets/[hash].js",
          assetFileNames: "assets/[hash][extname]",
          // Avoid exposing original module path names in the bundle
          generatedCode: {
            constBindings: true,
          },
        },
      },
    },
    esbuild: isProd
      ? {
          drop: ["console", "debugger"],
          legalComments: "none",
        }
      : undefined,
  };
});
