<template>
  <slot />
  <div
    id="support-widget-container"
    class="support-center-widget"
    v-if="!plainLayout"
  ></div>
</template>

<script lang="ts" setup>
import { computed, onMounted } from "vue";
import { usePageContext } from "@renderer/usePageContext";

onMounted(() => {
  const supportScript = document.createElement("script");
  supportScript.src =
    "https://cdn.libretexts.net/libretexts-support-widget.min.js";
  supportScript.async = true;
  document.body.appendChild(supportScript);
});

const pageContext = usePageContext().value;

const plainLayout = computed(() => {
  return pageContext?.urlParsed?.search?.plain_layout === "true";
});
</script>
