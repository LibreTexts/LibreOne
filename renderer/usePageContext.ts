import { App, InjectionKey, inject, Ref } from "vue";
import { PageContext } from "vike/types";

const key: InjectionKey<Ref<PageContext>> = Symbol();

/**
 * Inject the PageContext into a component.
 *
 * @returns The current PageContext.
 */
export function usePageContext(): Ref<PageContext> {
  const pageContext = inject(key);
  if (!pageContext) {
    throw new Error("setPageContext() not called in parent");
  }
  return pageContext;
}

/**
 * Registers the PageContext for use in the Vue application.
 *
 * @param app - The Vue app instance.
 * @param pageContext - The current page rendering context.
 */
export function setPageContext(app: App, pageContext: Ref<PageContext>): void {
  app.provide(key, pageContext);
}
