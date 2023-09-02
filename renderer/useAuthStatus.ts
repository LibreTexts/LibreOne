import { usePageContext } from './usePageContext';


export const useAuthStatus = () => {
  const pageContext = usePageContext();
  return (!!pageContext.user && !!pageContext.user.uuid);
};