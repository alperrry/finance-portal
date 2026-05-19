import { keycloakify } from "keycloakify/vite-plugin";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    keycloakify({
      themeName: "finance-portal",
      accountThemeImplementation: "none"
    })
  ],
  define: {
    global: "globalThis"
  }
});
