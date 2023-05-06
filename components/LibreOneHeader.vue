<template>
  <header class="bg-white shadow-2xl shadow-red-600">
    <nav
      class="flex flex-col w-auto items-center justify-between content-between p-6"
      aria-label="Global"
    >
      <section class="flex flex-row w-full items-center justify-between">
        <a href="#" class="mt-1">
          <img
            src="@renderer/libretexts_logo.png"
            alt="LibreTexts Logo"
            class="h-9 w-auto mb-1"
          />
        </a>
        <div class="hidden lg:flex lg:flex-row lg:flex-1 lg:ml-8">
          <a
            v-for="(item, idx) in navItems"
            :href="item.link"
            :key="idx"
            class="text-md font-semibold leading-6 text-gray-900"
            :class="idx > 0 ? 'ml-6' : ''"
          >
            {{ item.title }}
          </a>
        </div>
        <div class="flex flex-row">
          <button
            href="/api/v1/auth/logout"
            class="hidden md:block text-sm font-semibold leading-6 text-gray-900"
          >
            {{ $t("common.logout") }} <span aria-hidden="true">&rarr;</span>
          </button>
          <button
            class="md:hidden clicked-animation"
            @click="menuOpen = !menuOpen"
            aria-label="Open Navigation Menu"
            :class="menuOpen ? 'motion-safe:-rotate-90' : ''"
          >
            <img src="@renderer/menu-icon.svg" class="w-6 h-6" />
          </button>
        </div>
      </section>
      <Transition
        mode="out-in"
        enter-from-class="motion-safe:translate-x-full"
        enter-to-class="motion-safe:translate-x-0"
        leave-from-class="motion-safe:translate-x-0"
        leave-to-class="motion-safe:-translate-x-full"
        enter-active-class="motion-safe:transition-transform motion-safe:ease-out motion-safe:duration-300"
        leave-active-class="motion-safe:transition-transform motion-safe:ease-in motion-safe:duration-300"
      >
        <section
          v-if="menuOpen"
          class="flex flex-col justify-start w-full mt-3"
        >
          <div class="flex flex-col justify-start items-start w-full">
            <a
              v-for="(item, idx) in navItems"
              :key="idx"
              :href="item.link"
              class="text-md font-semibold leading-6 text-gray-900 my-2"
            >
              {{ item.title }}
            </a>
            <button
              href="/api/v1/auth/logout"
              class="text-sm font-semibold leading-6 text-gray-900 my-2"
            >
              {{ $t("common.logout") }} <span aria-hidden="true">&rarr;</span>
            </button>
          </div>
        </section>
      </Transition>
    </nav>
  </header>
</template>

<script lang="ts" setup>
import { ref } from "vue";

const menuOpen = ref<boolean>(false);

const navItems: { title: string; link: string }[] = [
  {
    title: "Profile",
    link: "/profile",
  },
  {
    title: "Security",
    link: "/security",
  },
];
</script>

<style lang="css">
.clicked-animation {
  transition: transform 0.4s ease-in-out;
}
</style>
