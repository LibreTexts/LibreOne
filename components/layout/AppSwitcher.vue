<template>
  <button
    class="app-switcher shadow-[0_2px_5px_-1px_rgba(0,0,0,0.2)] hover:shadow-[0_2px_5px_-1px_rgba(0,0,0,0.3)]  rounded-md px-2 pt-1"
    @click="isOpen = !isOpen"
    @keydown.prevent.enter="isOpen = !isOpen"
    tabindex="0"
    :class="
      isOpen
        ? 'shadow-[0_2px_5px_-1px_rgba(0,0,0,0.3)] rounded-md px-2 pt-1'
        : ''
    "
  >
    <img
      src="@renderer/libretexts_logo.png"
      alt="LibreTexts Logo"
      class="h-9 w-auto mb-1"
    />
    <FontAwesomeIcon
      icon="fa-solid fa-rocket"
      class="switcher-icon text-primary rounded-md px-2 mt-1 ml-2"
      size="lg"
    />
    <ul
      v-if="isOpen"
      class="switcher-menu"
      role="toolbar"
      tabindex="-1"
      :aria-expanded="isOpen"
    >
      <li
        class="switcher-item"
        v-for="(item, idx) in tempMenuItems"
        :key="idx"
        role="button"
        tabindex="0"
        @click="openAppSwitcherLink(item.href)"
        @keydown.prevent.enter="openAppSwitcherLink(item.href)"
        @focusout="handleFocusOut(idx)"
      >
        <div class="switcher-item-icon-container">
          <img :src="item.img" :alt="item.title" width="25" height="25" />
        </div>
        <div class="switcher-item-text-container">
          <p class="switcher-item-header">{{ item.title }}</p>
          <p class="switcher-item-descrip">{{ item.description }}</p>
        </div>
      </li>
    </ul>
  </button>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { usePageContext } from "@renderer/usePageContext";

const pageContext = usePageContext();

const tempMenuItems: {
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

const isOpen = ref<boolean>(false);

function openAppSwitcherLink(href: string) {
  window.open(href, "_blank");
}

function handleFocusOut(idx: number) {
  if (idx === tempMenuItems.length - 1) {
    isOpen.value = false;
  }
}
</script>

<style scoped lang="css">
.app-switcher {
  position: relative;
  display: flex;
}
.switcher-menu {
  position: absolute;
  display: block;
  left: 0;
  top: calc(100% + 0.8rem);
  width: 15rem;
  background-color: #fff;
  border-radius: 5px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.1);
}
.switcher-icon {
  padding-top: 6px;
  padding-bottom: 1px;
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
.switcher-item-text-container {
  display: flex;
  flex-direction: column;
  text-align: left;
}
.switcher-item-header {
  font-size: 0.9rem;
  font-weight: 500;
}
.switcher-item-descrip {
  font-size: 0.7rem;
  color: #6b7280;
}
</style>
