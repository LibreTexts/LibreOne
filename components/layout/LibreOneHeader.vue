<template>
  <header>
    <nav
      class="flex flex-col w-auto items-center justify-between content-between md:p-6 p-4"
      aria-label="Global"
    >
      <section class="flex flex-row w-full items-center justify-between">
        <AppSwitcher class="ml-2 pt-1" />
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
        <div class="flex flex-row mr-2">
          <button
            href="/api/v1/auth/logout"
            class="hidden md:block text-sm font-semibold leading-6 text-gray-900"
          >
            {{ $t("common.logout") }} <span aria-hidden="true">&rarr;</span>
          </button>
          <FontAwesomeIcon
            class="md:hidden clicked-animation"
            @click="menuOpen = !menuOpen"
            aria-label="Open Navigation Menu"
            :class="menuOpen ? 'motion-safe:-rotate-90' : ''"
            icon="fa-solid fa-bars"
            size="lg"
          />
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
  import { ref } from 'vue';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import AppSwitcher from './AppSwitcher.vue';

  const menuOpen = ref<boolean>(false);

  const navItems: { title: string; link: string }[] = [
    {
      title: 'Home',
      link: '/home',
    },
    {
      title: 'Profile',
      link: '/profile',
    },
    {
      title: 'Security',
      link: '/security',
    },
  ];
</script>

<style lang="css">
.clicked-animation {
  transition: transform 0.4s ease-in-out;
}
</style>
