import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

/*
 * Path alias for the shadcn/ui convention: `@/components/ui/button`
 * resolves to `src/components/ui/button.jsx`.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: /^@\//,
        replacement: `${fileURLToPath(new URL("./src", import.meta.url)).replace(/\\/g, "/")}/`,
      },
    ],
  },
});