import { renderToNodeStream } from "@vue/server-renderer";
import { createApp } from "./app";
import { escapeInject } from "vike/server";
import faviconURL from "./favicon.ico";
import { OnRenderHtmlAsync, PageContextBuiltIn } from "vike/types";
import { getPageTitle, getPageDescription } from "./helpers";

/**
 * Creates an application instance and renders it to HTML.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns Rendered application HTML.
 */

export const onRenderHtml: OnRenderHtmlAsync = async (pageContext): ReturnType<OnRenderHtmlAsync> => {
  const app = createApp(pageContext);
  const stream = renderToNodeStream(app);

  const title = getPageTitle(pageContext);
  const desc = getPageDescription(pageContext);

  let normalizedLocale = pageContext.locale;
  const splitLocale = pageContext.locale?.split("-");
  if (splitLocale?.length > 1) {
    normalizedLocale = `${splitLocale[0]}-${splitLocale[1].toUpperCase()}`;
  }

  const documentHtml = escapeInject`
      <!DOCTYPE html>
      <html lang="${normalizedLocale || "en-US"}">
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
      // https://vike.dev/streaming
      enableEagerStreaming: true,
    },
  };
};
