import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (
              id.includes("@prosemirror") ||
              id.includes("prosemirror")
            ) {
              return "prosemirror";
            }

            if (id.includes("@tiptap")) {
              return "tiptap";
            }

            if (id.includes("lucide-react")) {
              return "icons";
            }
          }

          return undefined;
        },
      },
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
});
