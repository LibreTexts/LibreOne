<template>
  <img
    :src="src"
    :width="width"
    class="avatar-img"
  >
</template>

<script setup lang="ts">
  import { computed } from 'vue';

  const DEFAULT_AVATAR_URL =
    'https://cdn.libretexts.net/DefaultImages/avatar.png';
  const props = withDefaults(
    defineProps<{
      src: string | undefined;
      width: number;
    }>(),
    {
      src: '',
      width: 25,
    },
  );

  const src = computed(() => {
    if (props.src) {
      return props.src;
    
    }
    return DEFAULT_AVATAR_URL;
  });
</script>

<style>
.avatar-img {
  border-radius: 50%;
  border: 0.5px solid #e5e7eb;
}
</style>
