import { createApp } from "./app";
import { OnRenderClientAsync } from "vike/types";
import { getPageTitle } from "./helpers";
import "./index.css";

/**
 * Creates an application instance and mounts it to the DOM.
 *
 * @param pageContext - The current client-side page rendering context.
 */
let app: ReturnType<typeof createApp>;
export const onRenderClient: OnRenderClientAsync = async (
  pageContext
): ReturnType<OnRenderClientAsync> => {
  if (!app) {
    app = createApp(pageContext);
    app.mount("#app");
  } else {
    app.changePage(pageContext);
  }
  document.title = getPageTitle(pageContext);
};
