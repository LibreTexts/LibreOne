<template>
  <div
    :class="`flex min-w-fit w-28 h-6 justify-center items-center rounded ${color}`"
  >
    <p class="text-xs text-center text-white font-medium px-2">
      <IconCircleCheck
        v-if="isInstructionVerified"
        color="white"
        :size="14"
        class="pr-1 inline align-text-bottom"
      />
      {{ isInstructionVerified ? "Verified Instructor" : "Unverified User" }}
    </p>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import { IconCircleCheck } from '@tabler/icons-vue';

  const props = withDefaults(
    defineProps<{
      status?: string;
    }>(),
    {
      status: 'not_attempted',
    },
  );

  const isInstructionVerified = computed(() => {
    return props.status === 'verified';
  });

  const color = computed(() => {
    return isInstructionVerified.value ? 'bg-green-500' : 'bg-gray-400';
  });
</script>
