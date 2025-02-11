import type { PageContextBuiltIn } from 'vike/types';
import type { PageContextBuiltInClient } from 'vike/types';
import type { App, ComponentPublicInstance } from 'vue';
import { Application } from '@server/types/applications';
import { User } from '@server/types/users';

type Page = ComponentPublicInstance;
type PageProps = object;

export type PageContextUser = User & { apps?: Application[] };

export type PageContextInitCustom = {
  urlOriginal: string;
  productionURL: string;
  isAuthenticated: boolean;
  expiredAuth: boolean;
  redirectTo?: string;
  user?: PageContextUser;
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
  user?: PageContextUser;
};

type PageContextServer = PageContextBuiltIn<Page> & PageContextCustom;
type PageContextClient = PageContextBuiltInClient<Page> & PageContextCustom;

type PageContext = PageContextClient | PageContextServer;

export type { PageContextServer };
export type { PageContextClient };
export type { PageContext };
export type { PageProps };

export type Item = {
  text: string;
  value: unknown;
}