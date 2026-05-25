import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
      },
      manifest: {
        id: "/?app=athenaeum",
        name: "Athenaeum — Personalised learning on Singapore",
        short_name: "Athenaeum",
        description: "Bloom-staged courses on Singapore's economy, law, governance, NTUC & diplomacy — with an AI debate partner.",
        theme_color: "#c4654a",
        background_color: "#faf8f5",
        display: "standalone",
        orientation: "portrait",
        start_url: "/?app=athenaeum",
        scope: "/",
        icons: [
          { src: "/pwa-192.png?v=athenaeum", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png?v=athenaeum", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512.png?v=athenaeum", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
