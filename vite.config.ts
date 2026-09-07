import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  // Vercel's current Vite pipeline hits a Lightning CSS parser issue with
  // Tailwind v4's generated @media source(...) syntax during minification.
  // Keep CSS minification off for this deployment; Tailwind still processes
  // the stylesheet normally.
  cssMinify: false,
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [tanstackStart(), nitro(), viteReact()],
});

  resolve: {
    tsconfigPaths: true,
  },
  plugins: [tanstackStart(), nitro(), viteReact()],
});
