import type { PageContextBuiltIn } from 'vite-plugin-ssr';
import type { PageContextBuiltInClient } from 'vite-plugin-ssr/client'; // When using Server Routing
import type { App, ComponentPublicInstance } from 'vue';

type Page = ComponentPublicInstance;
type PageProps = object;

export type PageContextInitCustom = {
  urlOriginal: string;
  productionURL: string;
  isAuthenticated: boolean;
  expiredAuth: boolean;
  redirectTo?: string;
  user?: Record<string, string>;
};

export type PageContextCustom = {
  app: App<Element>;
  Page: Page;
  pageProps?: PageProps;
  urlPathname: string;
  exports: {
    documentProps?: {
      title?: string;
      description?: string;
    },
  },
  locale: string;
  productionURL: string;
  redirectTo?: string;
  isAuthenticated: boolean;
  expiredAuth: boolean;
  user?: Record<string, string>;
};

type PageContextServer = PageContextBuiltIn<Page> & PageContextCustom;
type PageContextClient = PageContextBuiltInClient<Page> & PageContextCustom;

type PageContext = PageContextClient | PageContextServer;

export type { PageContextServer };
export type { PageContextClient };
export type { PageContext };
export type { PageProps };