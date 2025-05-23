import { usePageContext } from "./usePageContext";

export const useUserRole = () => {
  const pageContext = usePageContext().value;
  if (!(!!pageContext.user && !!pageContext.user.uuid)) {
    return undefined;
  }

  return pageContext.user.user_type;
};
