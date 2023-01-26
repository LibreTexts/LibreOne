import { createApp } from './app';
import type { PageContextClient } from './types';
import './index.css';

/**
 * Creates an application instance and mounts it to the DOM.
 *
 * @param pageContext - The current client-side page rendering context.
 */
export async function render(pageContext: PageContextClient) {
  const app = createApp(pageContext);
  app.mount('#app');
}
