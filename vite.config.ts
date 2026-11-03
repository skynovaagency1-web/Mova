import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Multi-page build: the marketing site, the interactive prototype, the legal pages, password reset, 404 and the staff ops console.
export default defineConfig({
  base: "/", // served from the site root by the Cloudflare Worker
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  // `npm run dev` + `npx wrangler dev` in another terminal: the API is proxied to the local Worker.
  server: { proxy: { "/api": "http://localhost:8787" } },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        app: path.resolve(__dirname, "app.html"),
        legal: path.resolve(__dirname, "mentions-legales.html"),
        terms: path.resolve(__dirname, "cgu.html"),
        privacy: path.resolve(__dirname, "confidentialite.html"),
        ops: path.resolve(__dirname, "ops/index.html"),
        reset: path.resolve(__dirname, "reinitialiser.html"),
        notFound: path.resolve(__dirname, "404.html"),
      },
    },
  },
});
