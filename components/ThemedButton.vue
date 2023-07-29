<template>
  <button v-bind="$attrs" :class="variantClasses">
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    variant: "default" | "save" | "outlined" | "danger";
  }>(),
  {
    variant: "default",
  }
);

const variantClasses = computed(() => {
  const baseClasses =
    "inline-flex items-center justify-center h-10 rounded-md w-full text-white font-medium hover:shadow";
  let variantClasses = "";
  switch (props.variant) {
    case "save":
      variantClasses = "bg-save hover:bg-green-600";
      break;
    default:
      variantClasses = "bg-primary hover:bg-sky-700";
      break;
  }

  return `${baseClasses} ${variantClasses}`;
});
</script>
