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
    noExternal: ["vue-i18n"],
  },
  optimizeDeps: {
    include: [
      "@fontawesome/fontawesome-svg-core",
      "@fortawesome/free-solid-svg-icons",
      "@fortawesome/vue-fontawesome",
    ],
  }
};

export default config;
