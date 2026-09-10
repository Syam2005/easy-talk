import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
      },
      includeAssets: ["favicon-16x16.png", "favicon-32x32.png"],
      manifest: {
        name: "Easy Talk",
        short_name: "Easy Talk",
        description: "Real-time chat with scheduling, AI summaries, calls, and meetings.",
        theme_color: "#0B0E1A",
        background_color: "#0B0E1A",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // During "npm run dev" the frontend still runs on its own port for fast
    // hot-reload, but relative calls like fetch('/api/...') should still work
    // exactly like they do in the merged production server — so proxy them to
    // the backend instead of requiring a hardcoded VITE_API_URL during dev too.
    proxy: {
      "/api": "http://localhost:5000",
      "/uploads": "http://localhost:5000",
      "/socket.io": { target: "http://localhost:5000", ws: true },
    },
  },
});
