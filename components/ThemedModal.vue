<template>
  <Dialog :open="isOpen" @close="isOpen = false">
    <slot />
  </Dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Dialog } from "@libretexts/davis-vue";

const isOpen = ref(false);

const show = () => {
  isOpen.value = true;
};

const close = () => {
  isOpen.value = false;
};

defineExpose({ show, close });
</script>
