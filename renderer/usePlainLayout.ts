import { computed } from "vue";
import { usePageContext } from "./usePageContext";

export function usePlainLayout() {
  const pageContext = usePageContext().value;
  const plainLayout = computed(() => {
    return pageContext.urlParsed?.search?.plain_layout === "true";
  });
  return plainLayout;
}
