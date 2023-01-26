import { App, InjectionKey, inject } from 'vue';
import { PageContext } from './types';

const key: InjectionKey<PageContext> = Symbol();

/**
 * Inject the PageContext into a component.
 *
 * @returns The current PageContext.
 */
export function usePageContext() {
  const pageContext = inject(key);
  if (!pageContext) {
    throw new Error('setPageContext() not called in parent');
  }
  return pageContext;
}

/**
 * Registers the PageContext for use in the Vue application.
 *
 * @param app - The Vue app instance.
 * @param pageContext - The current page rendering context.
 */
export function setPageContext(app: App, pageContext: PageContext) {
  app.provide(key, pageContext);
}
