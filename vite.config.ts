import path from "path";
import vue from "@vitejs/plugin-vue";
import vike from "vike/plugin";
import tailwindcss from "@tailwindcss/vite";
import { UserConfig } from "vite";

const config: UserConfig = {
  plugins: [tailwindcss(), vue(), vike()],
  resolve: {
    alias: {
      "@server": path.join(__dirname, "server"),
      "@renderer": path.join(__dirname, "renderer"),
      "@components": path.join(__dirname, "components"),
      "@pages": path.join(__dirname, "pages"),
      include: path.resolve(__dirname, "locales/**"),
      "@locales": path.join(__dirname, "locales"),
    },
  },
  ssr: {
    // FontAwesome's svg-core exposes a module-level `library` singleton. If it is
    // externalized for SSR, the server loads a different instance than the one the
    // icon component reads, so icons render as empty comments on the server and
    // mismatch on hydration. Bundling it (and the rest of the FA packages) forces a
    // single shared instance.
    noExternal: ["vue-i18n", /@fortawesome\//],
  },
  optimizeDeps: {
    include: [
      "@fortawesome/fontawesome-svg-core",
      "@fortawesome/free-solid-svg-icons",
      "@fortawesome/vue-fontawesome",
    ],
  }
};

export default config;
