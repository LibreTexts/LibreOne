import { ApplicationController } from "@server/controllers/ApplicationController";
import { PageContextServer } from "vike/types";

/**
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with any applicable redirect.
 */
export default async function onBeforeRender(pageContext: PageContextServer) {
    // Ensure that the user is authenticated before proceeding
    let redirectTo: string | null = null;
    if (!pageContext.user) {
        redirectTo = '/api/v1/auth/login';
    }

    const redirectHome = () => {
        return {
            pageContext: {
                redirectTo: '/home',
            },
        }
    }

    const origSearchParams = pageContext.urlParsed.search;
    const searchParams = new URLSearchParams(origSearchParams);
    const trial_expired = searchParams.get('trial_expired');
    const applicationID = searchParams.get('application');
    const serviceURL = searchParams.get('service_url');

    console.log('[AuthInterrupt] onBeforeRender called with params:', {
        trial_expired,
        applicationID,
        serviceURL,
    });

    if (!applicationID || isNaN(parseInt(applicationID, 10)) || !serviceURL) {
        return redirectHome();
    }

    // Check that there is a redirect_uri param in the service URL
    let parsed_service_url: URL | null = null;
    let parsed_redirect_uri: URL | null = null;
    try {
        const serviceURLObj = new URL(serviceURL)
        parsed_service_url = serviceURLObj;

        // Parse the redirect_uri from the service URL
        const redirect_uri = parsed_service_url.searchParams.get('redirect_uri');
        if (!redirect_uri) {
            console.warn('[AuthInterrupt] Service URL does not contain redirect_uri:', serviceURL);
            return redirectHome();
        }

        parsed_redirect_uri = new URL(redirect_uri);
    } catch (error) {
        console.error('[AuthInterrupt] Invalid service URL:', serviceURL, error);
        return redirectHome();
    }

    const appController = new ApplicationController();
    const application = await appController.getApplicationInternal(parseInt(applicationID, 10));
    if (!application) {
        console.warn('[AuthInterrupt] Application not found for ID:', applicationID);
        return {
            pageContext: {
                redirectTo: '/home',
            },
        };
    }

    // Ensure that the service URL is a LibreTexts hostname and
    // redirect starts with the cas_service_url of the application to prevent URL manipulation
    if (!parsed_service_url.hostname.endsWith('libretexts.org') && !parsed_service_url.hostname.endsWith('libretexts.net')) {
        console.warn('[AuthInterrupt] Service URL is not a LibreTexts hostname:', parsed_service_url.hostname);
        return redirectHome();
    }

    if (!parsed_redirect_uri.href.startsWith(application.cas_service_url)) {
        console.warn('[AuthInterrupt] Service URL does not match application CAS service URL:', parsed_redirect_uri.href, application.cas_service_url);
        return redirectHome();
    }

    return {
        pageContext: {
            pageProps: {
                application: application.get(),
                service_url: parsed_service_url.href,
                test: true,
                ...(trial_expired && { trial_expired: trial_expired === 'true' }),
            }
        },
    };
}
