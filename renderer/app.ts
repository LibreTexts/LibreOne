import { App, createSSRApp, defineComponent, h } from 'vue';
import { createI18n } from 'vue-i18n';
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import {
  faCircleArrowLeft,
  faCircleArrowRight,
  faCircleInfo,
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';
import { setPageContext } from './usePageContext';
import { initAxios } from './useAxios';
import BaseLayout from '@components/BaseLayout.vue';
import enUSMessages from '@locales/en-us.json';
import esMXMessages from '@locales/es-mx.json'
import type { PageContext } from './types';

/**
 * Creates a new Vue application instance and registers helpers and global properties.
 *
 * @param pageContext - The current (isomorphic) page rendering context.
 * @returns The initialized Vue application.
 */
export function createApp(pageContext: PageContext): App<Element> {
  const { Page, pageProps } = pageContext;

  const PageWithLayout = defineComponent({
    render() {
      return h(
        BaseLayout,
        { },
        {
          default() {
            return h(Page, pageProps || {});
          },
        },
      );
    },
  });

  const app = createSSRApp(PageWithLayout);

  // Make `pageContext` available from any Vue component
  setPageContext(app, pageContext);

  // Make the shared Axios instance available in all components
  initAxios(app, { baseUrl: '/api/v1' });
  
  // I18n
  const i18n = createI18n({
    legacy: false, // use Composition API
    locale: pageContext.locale,
    fallbackLocale: 'en-us',
    messages: {
      'en-us': enUSMessages,
      'es-mx': esMXMessages,
    },
  });
  app.use(i18n);

  // Font Awesome
  library.add(faEye, faEyeSlash, faCircleArrowRight, faCircleInfo, faCircleArrowLeft);
  app.component('FontAwesomeIcon', FontAwesomeIcon);

  return app;
}
