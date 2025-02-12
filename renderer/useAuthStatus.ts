import { usePageContext } from './usePageContext';


export const useAuthStatus = () => {
  const pageContext = usePageContext().value;
  return (!!pageContext.user && !!pageContext.user.uuid);
};