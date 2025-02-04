import type { PageContextServer } from '@renderer/types';
import { AuthController } from '@server/controllers/AuthController';

/**
 * Reads search parameters provided in the URL and transforms them to component props.
 *
 * @param pageContext - The current server-side page rendering context.
 * @returns New pageContext object with parsed props.
 */
export async function onBeforeRender(pageContext: PageContextServer) {
  const searchParams = pageContext.urlParsed.search;
  
  let token: string | null = null;
  let verificationSuccess = false;

  if (searchParams.token) {
    token = searchParams.token;
  }

  const authController = new AuthController();
  verificationSuccess = await authController.handleEmailVerificationRecovery(token);

  return {
    pageContext: {
      pageProps: {
        verificationSuccess,
      },
    },
  };
}
