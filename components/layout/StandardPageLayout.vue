<template>
  <LibreOneHeader :authorized="isAuthorized" :userRole="userRole" v-if="!plainLayout"/>
  <div
    :class="`flex flex-column justify-center items-start min-h-screen ` + 
      (plainLayout ? ' bg-white p-0' : ' pr-2 pb-10 bg-zinc-100 shadow-inner')"
  >
    <div
      :class="
        `bg-white py-10 px-8 shadow-gray-400 h-fit rounded-md` +
          sizeClasses +
          (plainLayout ? ' w-full mt-0' : ' w-11/12 mt-16 shadow-md')
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
  import { useUserRole } from '@renderer/useUserRole';
  import { usePlainLayout } from '@renderer/usePlainLayout';

  // Props & Context
  const props = defineProps({
    fillHeight: {
      type: Boolean,
      default: false,
    },
  });
  const isAuthorized = useAuthStatus();
  const userRole = useUserRole();
  const plainLayout = usePlainLayout();

  const sizeClasses = computed(() => {
    return props.fillHeight ? ' h-5/6' : ' h-auto';
  });
</script>
