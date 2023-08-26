<template>
  <div
    :class="`flex min-w-fit w-28 h-6 justify-center items-center rounded ${color}`"
  >
    <p class="text-xs text-center text-white font-medium px-2">
      <FontAwesomeIcon
        v-if="isInstructionVerified"
        icon="fa-solid fa-check-circle"
        color="white"
        size="sm"
        class="pr-1"
      />
      {{ isInstructionVerified ? "Verified Instructor" : "Unverified User" }}
    </p>
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

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
