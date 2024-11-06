<template>
  <dialog
    class="bg-white shadow-md rounded-md p-8 z-50"
    ref="dialogRef"
    @click="closeFromEvent"
  >
    <slot />
  </dialog>
</template>

<script setup lang="ts">
import { ref, defineExpose } from "vue";
const dialogRef = ref<HTMLDialogElement | null>(null);

const show = () => {
  dialogRef.value?.showModal();
};

const close = () => {
  dialogRef.value?.close();
};

const closeFromEvent = (e: MouseEvent) => {
  if (e.currentTarget === e.target) {
    close();
  }
};

defineExpose({
  show,
  close,
});
</script>
