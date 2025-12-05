<template>
  <StagingEnvBanner v-if="!isProduction" />
  <AnnouncementBanner
    v-for="announcement in pageContext?.announcements || []"
    :key="announcement.uuid"
    :announcement="announcement"
  />
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
import StagingEnvBanner from "./layout/StagingEnvBanner.vue";
import AnnouncementBanner from "./layout/AnnouncementBanner.vue";

onMounted(() => {
  const supportScript = document.createElement("script");
  supportScript.src =
    "https://cdn.libretexts.net/libretexts-support-widget.min.js";
  supportScript.async = true;
  document.body.appendChild(supportScript);
});

const pageContext = usePageContext().value;
const isProduction = computed(() => {
  return import.meta.env.VITE_NODE_ENV === "production";
});

const plainLayout = computed(() => {
  return pageContext?.urlParsed?.search?.plain_layout === "true";
});
</script>
