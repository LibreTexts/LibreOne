<template>
  <LibreOneHeader :authorized="isAuthorized" />
  <div
    class="bg-zinc-100 flex flex-column justify-center items-start min-h-screen shadow-inner pr-2 pb-10"
  >
    <div
      :class="
        `w-11/12 bg-white mt-16 py-10 px-8 shadow-md shadow-gray-400 h-fit rounded-md` +
          sizeClasses
      "
    >
      <Transition
        mode="out-in"
        enter-from-class="motion-safe:translate-x-full"
        enter-to-class="motion-safe:translate-x-0"
        leave-from-class="motion-safe:translate-x-0"
        leave-to-class="motion-safe:-translate-x-full"
        enter-active-class="motion-safe:transition-transform motion-safe:ease-out motion-safe:duration-500"
        leave-active-class="motion-safe:transition-transform motion-safe:ease-in motion-safe:duration-300"
      >
        <slot />
      </Transition>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue';
  import LibreOneHeader from '@components/layout/LibreOneHeader.vue';
  import { useAuthStatus } from '@renderer/useAuthStatus';

  // Props & Context
  const props = defineProps({
    fillHeight: {
      type: Boolean,
      default: false,
    },
  });
  const isAuthorized = useAuthStatus();

  const sizeClasses = computed(() => {
    return props.fillHeight ? ' h-5/6' : ' h-auto';
  });
</script>
