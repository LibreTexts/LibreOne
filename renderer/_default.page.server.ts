import { renderToNodeStream } from '@vue/server-renderer';
import { escapeInject } from 'vite-plugin-ssr';
import { createApp } from './app';
import faviconURL from './favicon.ico';
import type { PageContextServer } from './types';
import { UserController } from '../server/controllers/UserController';

export const passToClient = ['pageProps', 'urlPathname', 'locale', 'user'];

/**
 * Retrieves the currently authenticated user (if applicable) and inserts their basic
 * information in the page rendering context.
 * 
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with any applicable user information.
 */
export async function onBeforeRender(pageContext: PageContextServer) {
  let user: Record<string, string> | null = null;
  if (pageContext.isAuthenticated && pageContext.user?.uuid) {
    const userController = new UserController();
    user = await userController.getUserInternal(pageContext.user.uuid);
  }
  return {
    pageContext: {
      ...(user && {
        user,
      }),
    },
  };
}

/**
 * Creates an application instance and renders it to HTML.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns Rendered application HTML.
 */
export async function render(pageContext: PageContextServer) {
  const app = createApp(pageContext);
  const stream = renderToNodeStream(app);

  const { documentProps } = pageContext.exports;
  const title = (documentProps && documentProps.title) || 'LibreOne';
  const desc = (documentProps && documentProps.description) || 'LibreOne identity management interface.';

  let normalizedLocale = pageContext.locale;
  const splitLocale = pageContext.locale.split('-');
  if (splitLocale.length > 1) {
    normalizedLocale = `${splitLocale[0]}-${splitLocale[1].toUpperCase()}`;
  }

  const documentHtml = escapeInject`
    <!DOCTYPE html>
    <html lang="${normalizedLocale}">
      <head>
        <meta charset="UTF-8" />
        <link rel="icon" href="${faviconURL}" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="${desc}" />
        <title>${title}</title>
      </head>
      <body>
        <div id="app">${stream}</div>
      </body>
    </html>
  `;

  return {
    documentHtml,
    pageContext: {
      enableEagerStreaming: true,
    },
  };
}
