import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      $: "/src",
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React ecosystem
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Supabase
          "vendor-supabase": ["@supabase/supabase-js"],
          // Charts (heaviest single dep)
          "vendor-charts": ["recharts"],
          // Framer Motion
          "vendor-motion": ["framer-motion"],
          // Utility libs
          "vendor-utils": [
            "lucide-react",
            "react-parallax-tilt",
            "react-countup",
            "tailwind-merge",
            "@fingerprintjs/fingerprintjs",
          ],
        },
      },
    },
  },
});

