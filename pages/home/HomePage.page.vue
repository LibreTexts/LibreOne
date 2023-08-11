<template>
  <StandardPageLayout fillHeight>
    <div aria-live="polite">
      <div>
        <p class="text-3xl font-medium">{{ $t("home.yourlibreverse") }}</p>
        <p class="mt-2 italic text-gray-400">
          {{ $t("home.yourlibreversetagline") }}
        </p>
      </div>
      <div class="apps-grid px-4">
        <div
          class="app-item-container"
          v-for="app in tempApps"
          @click="openAppLink(app.href)"
        >
          <div class="app-item-icon-container">
            <img :src="app.img" :alt="app.title" width="25" height="25" />
          </div>
          <div class="app-item-text-container">
            <p class="app-item-header">{{ app.title }}</p>
            <p class="app-item-descrip">{{ app.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </StandardPageLayout>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import StandardPageLayout from "../../components/layout/StandardPageLayout.vue";
import SecurityInfo from "../../components/account_management/SecurityInfo.vue";
import { usePageContext } from "../../renderer/usePageContext";

const pageContext = usePageContext();

const unknownerror = ref(false);
const tempApps: {
  img: string;
  title: string;
  href: string;
  description: string;
}[] = [
  {
    img: "",
    title: "ADAPT",
    href: "https://adapt.libretexts.org",
    description: "Create and share interactive content",
  },
  {
    img: "",
    title: "Commons",
    href: "https://commons.libretexts.org",
    description: "Find, remix, and share content",
  },
  {
    img: "",
    title: "Conductor",
    href: "https://commons.libretexts.org/conductor",
    description: "Manage your OER projects",
  },
  {
    img: "",
    title: "LibreTexts Website",
    href: "https://libretexts.org",
    description: "Learn more about LibreTexts",
  },
];

function openAppLink(href: string) {
  window.open(href, "_blank");
}
</script>
<style lang="css" scoped>
.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  grid-gap: 1rem;
  margin-top: 2rem;
}
.app-item-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-items: center;
  text-align: center;
  width: 12rem;
  height: 12rem;
  padding: 0.5rem;
  cursor: pointer;
}
.app-item-icon-container {
  display: flex;
  width: 75%;
  height: 60%;
  border-radius: 5px;
  background-color: #e5e7eb;
  align-items: center;
  justify-content: center;
}
.app-item-icon-container:hover {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}
.app-item-text-container {
  display: flex;
  flex-direction: column;
  text-align: center;
  margin-top: 0.75rem;
}
.app-item-header {
  font-size: 0.9rem;
  font-weight: 500;
}
.app-item-descrip {
  font-size: 0.7rem;
  color: #6b7280;
}
</style>
