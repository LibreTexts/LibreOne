<template>
  <button
    class="app-switcher hover:shadow-[0_2px_5px_-1px_rgba(0,0,0,0.3)] rounded-md px-2 pt-1"
    @click="isOpen = !isOpen"
  >
    <div class="flex">
      <img
        src="@renderer/libretexts_logo.png"
        alt="LibreTexts Logo"
        class="h-9 w-auto mb-1"
      />
      <FontAwesomeIcon
        icon="fa-solid fa-bolt"
        class="text-primary rounded-md px-2 py-1 mt-1 ml-2"
        size="lg"
      />
      <div v-if="isOpen" class="switcher-menu">
        <div
          class="switcher-item"
          v-for="(item, idx) in tempMenuItems"
          @click="openAppSwitcherLink(item.href)"
        >
          <div class="switcher-item-icon-container">
            <img :src="item.img" :alt="item.title" width="25" height="25" />
          </div>
          <div class="switcher-item-text-container">
            <p>{{ item.title }}</p>
          </div>
        </div>
      </div>
    </div>
  </button>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { usePageContext } from "@renderer/usePageContext";

const pageContext = usePageContext();

const tempMenuItems: { img: string; title: string; href: string }[] = [
  {
    img: "",
    title: "ADAPT",
    href: "https://adapt.libretexts.org",
  },
  {
    img: "",
    title: "Commons",
    href: "https://commons.libretexts.org",
  },
  {
    img: "",
    title: "Conductor",
    href: "https://commons.libretexts.org/conductor",
  },
  {
    img: "",
    title: "LibreTexts Website",
    href: "https://libretexts.org",
  },
];

const isOpen = ref<boolean>(false);

function openAppSwitcherLink(href: string) {
  window.open(href, "_blank");
}
</script>

<style scoped lang="css">
.app-switcher {
  position: relative;
}
.switcher-menu {
  position: absolute;
  left: 0;
  top: calc(100% + 0.8rem);
  background-color: #fff;
  border-radius: 5px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.1);
}
.switcher-item {
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.switcher-item:hover {
  background-color: #f9fafb;
}
.switcher-item-icon-container {
  width: 2rem;
  height: 2rem;
  border-radius: 5px;
  background-color: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.5rem;
}
</style>
