import type { App, ComponentPublicInstance } from "vue";
import { Application } from "@server/types/applications";
import { User } from "@server/types/users";
import { Announcement } from "@server/models";

export type PageContextUser = User & { apps?: Application[] };

export type Component = ComponentPublicInstance; // https://stackoverflow.com/questions/63985658/how-to-type-vue-instance-out-of-definecomponent-in-vue-3/63986086#63986086
type Page = Component;

// https://vike.dev/pageContext#typescript
declare global {
  namespace Vike {
    interface PageContext {
      Page: Page;
      pageProps?: Record<string, unknown>;
      data?: {
        // Needed by getPageTitle() and onBeforePrerenderStart()
        title?: string;
        description?: string;
      };
      config: {
        /** Title defined statically by /pages/some-page/+title.js (or by `export default { title }` in /pages/some-page/+config.js) */
        title?: string;
        description?: string;
      };
      locale: string;
      abortReason?: string;
      urlOriginal: string;
      urlLogical?: string;
      productionURL: string;
      isAuthenticated: boolean;
      expiredAuth: boolean;
      redirectTo?: string;
      announcements?: Announcement[];
      user?: PageContextUser;
    }
  }
}

export type PageContext = Vike.PageContext;

//type Page = ComponentPublicInstance;
//type PageProps = object;

// export type PageContextInitCustom = {
//   urlOriginal: string;
//   productionURL: string;
//   isAuthenticated: boolean;
//   expiredAuth: boolean;
//   redirectTo?: string;
//   user?: PageContextUser;
// };

// export type PageContextCustom = {
//   app: App<Element>;
//   Page: Page;
//   pageProps?: PageProps;
//   urlPathname: string;
//   exports: {
//     documentProps?: {
//       title?: string;
//       description?: string;
//     },
//   },
//   locale: string;
//   productionURL: string;
//   redirectTo?: string;
//   isAuthenticated: boolean;
//   expiredAuth: boolean;
//   user?: PageContextUser;
// };

export type Item = {
  text: string;
  value: unknown;
};
