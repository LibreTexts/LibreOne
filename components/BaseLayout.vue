<template>
  <slot />
  <div id="support-widget-container" class="support-center-widget"></div>
</template>

<script lang="ts" setup>
import { onMounted } from "vue";

onMounted(() => {
  const supportScript = document.createElement("script");
  supportScript.src =
    "https://cdn.libretexts.net/libretexts-support-widget.min.js";
  supportScript.async = true;
  document.body.appendChild(supportScript);
});
</script>
