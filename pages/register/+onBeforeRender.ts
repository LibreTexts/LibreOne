import { buildLocalizedServerRedirectURL } from "@renderer/helpers";
import { AnnouncementController } from "@server/controllers/AnnouncementController";
import {
  getCASBaseURL,
  getProductionLoginURL,
  isValidServiceURIForRedirect,
} from "@server/helpers";
import { PageContextServer } from "vike/types";

/**
 * Reads search parameters provided in the URL and transforms them to component props. Redirects
 * to the dashboard if the user is already authenticated.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with parsed props or redirect URL.
 */
export default async function onBeforeRender(pageContext: PageContextServer) {
  // Redirect if already authenticated
  if (pageContext.isAuthenticated && pageContext.user) {
    const redirectTo = buildLocalizedServerRedirectURL(pageContext, "/profile");
    return {
      pageContext: {
        redirectTo,
      },
    };
  }

  const announcementController = new AnnouncementController();
  const announcements = await announcementController.getAnnouncementsInternal(['registration']);

  const origSearchParams = pageContext.urlParsed.search;
  const searchParams = new URLSearchParams(origSearchParams);
  const redirectURI = searchParams.get("redirect_uri");
  const serviceParam = searchParams.get("service");

  const loginParams = new URLSearchParams({
    ...origSearchParams,
  });
  const recoveryParams = new URLSearchParams({
    src: `/register?${searchParams.toString()}`,
    ...(redirectURI && { redirect_uri: redirectURI }),
  });
  const googleParams = new URLSearchParams({
    client_name: "GoogleWorkspace",
    locale: "en",
    ...origSearchParams,
  });
  const microsoftParams = new URLSearchParams({
    client_name: "MicrosoftActiveDirectory",
    locale: "en",
    ...origSearchParams,
  });

  return {
    pageContext: {
      pageProps: {
        loginURL: `${getProductionLoginURL()}${loginParams.toString()}`,
        recoveryURL: `/passwordrecovery?${recoveryParams.toString()}`,
        googleRegisterURL: `${getCASBaseURL()}/cas/clientredirect?${googleParams.toString()}`,
        microsoftRegisterURL: `${getCASBaseURL()}/cas/clientredirect?${microsoftParams.toString()}`,
        serviceURL:
          serviceParam && isValidServiceURIForRedirect(serviceParam)
            ? serviceParam
            : undefined,
        announcements,
      },
      loginURL: `${getProductionLoginURL()}${loginParams.toString()}`,
      recoveryURL: `/passwordrecovery?${recoveryParams.toString()}`,
      googleRegisterURL: `${getCASBaseURL()}/cas/clientredirect?${googleParams.toString()}`,
      microsoftRegisterURL: `${getCASBaseURL()}/cas/clientredirect?${microsoftParams.toString()}`,
      serviceURL:
        serviceParam && isValidServiceURIForRedirect(serviceParam)
          ? serviceParam
          : undefined,
    },
  };
}
