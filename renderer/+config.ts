import type { Config } from "vike/types";

export default {
  passToClient: ["pageProps", "locale", "user", "routeParams", "announcements"],
  clientRouting: true,
  prefetchStaticAssets: "viewport",
  meta: {
    title: {
      env: { server: true, client: true },
    },
    description: {
      env: { server: true, client: true },
    },
  },
} satisfies Config;

// https://vike.dev/meta#typescript
declare global {
  namespace Vike {
    interface Config {
      /** The page's `<title>` */
      title?: string;
    }
  }
}
