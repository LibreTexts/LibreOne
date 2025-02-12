import { createSSRApp, h, shallowRef } from "vue";
import { createI18n } from "vue-i18n";
import { library } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
  faCircleArrowLeft,
  faCircleArrowRight,
  faCircleCheck,
  faCircleInfo,
  faEye,
  faEyeSlash,
  faBars,
  faBolt,
  faRocket,
  faKey,
  faScrewdriverWrench,
  faRightFromBracket,
  faChevronUp,
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { setPageContext } from "./usePageContext";
import { initAxios } from "./useAxios";
import BaseLayout from "@components/BaseLayout.vue";
import enUSMessages from "@locales/en-us.json";
import esMXMessages from "@locales/es-mx.json";
import type { PageContext } from "vike/types";
import { objectAssign } from "./utils/objectAssign";
import { setData } from "./useData";

/**
 * Creates a new Vue application instance and registers helpers and global properties.
 *
 * @param pageContext - The current (isomorphic) page rendering context.
 * @returns The initialized Vue application.
 */
export function createApp(pageContext: PageContext) {
  const pageContextRef = shallowRef(pageContext);
  const dataRef = shallowRef(pageContext.data);
  const pageRef = shallowRef(pageContext.Page);

  const RootComponent = () => h(BaseLayout, {}, () => h(pageRef.value, pageContextRef.value.pageProps));
  const app = createSSRApp(RootComponent);
  setPageContext(app, pageContextRef);
  setData(app, dataRef);

  // app.changePage() is called upon navigation, see +onRenderClient.ts
  objectAssign(app, {
    changePage: (pageContext: PageContext) => {
      pageContextRef.value = pageContext;
      dataRef.value = pageContext.data;
      pageRef.value = pageContext.Page;
    },
  });

  // Make the shared Axios instance available in all components
  initAxios(app, { baseUrl: "/api/v1" });

  // I18n
  const i18n = createI18n({
    legacy: false, // use Composition API
    locale: pageContext.locale,
    fallbackLocale: "en-us",
    messages: {
      "en-us": enUSMessages,
      "es-mx": esMXMessages,
    },
  });
  app.use(i18n);

  // Font Awesome
  library.add(
    faEye,
    faEyeSlash,
    faCircleArrowRight,
    faCircleCheck,
    faCircleInfo,
    faCircleArrowLeft,
    faBars,
    faBolt,
    faKey,
    faRocket,
    faScrewdriverWrench,
    faRightFromBracket,
    faChevronUp,
    faChevronDown,
    faChevronRight
  );
  app.component("FontAwesomeIcon", FontAwesomeIcon);

  return app;
}
