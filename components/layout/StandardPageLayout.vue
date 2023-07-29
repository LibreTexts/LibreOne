<template>
  <LibreOneHeader />
  <div
    class="bg-zinc-100 flex flex-column justify-center items-start min-h-screen"
  >
    <div
      class="w-11/12 bg-white mt-16 py-10 px-8 shadow-md shadow-gray-400 rounded-md overflow-hidden"
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
import LibreOneHeader from "../../components/LibreOneHeader.vue";
</script>
