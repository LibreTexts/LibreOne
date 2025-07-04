<template>
  <button
    v-bind="$attrs"
    :class="variantClasses"
    :aria-busy="$props.loading"
    :disabled="$props.disabled || $props.loading"
  >
    <FontAwesomeIcon
      class="mr-3"
      :icon="$props.icon"
      v-if="$props.icon"
    />
    <slot v-if="!$props.loading" />
    <template v-else>
      <LoadingIndicator />
      <span class="ml-2">{{ $t("common.loading") }}...</span>
    </template>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import LoadingIndicator from "@components/LoadingIndicator.vue";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

const props = withDefaults(
  defineProps<{
    variant?: "default" | "save" | "outlined" | "danger";
    small?: boolean;
    disabled?: boolean;
    loading?: boolean;
    icon?: string;
  }>(),
  {
    variant: "default",
    small: false,
    disabled: false,
    loading: false,
    icon: "",
  }
);

const variantClasses = computed(() => {
  const baseClasses =
    "flex items-center justify-center rounded-md text-white font-medium hover:shadow";

  const sizeClasses = props.small ? "w-40 h-6 text-sm pb-0.5" : "w-full h-10";

  //If the button is disabled, we don't want to apply any of the other classes
  if (props.disabled) {
    return `${baseClasses} ${sizeClasses} bg-gray-400 cursor-default`;
  }

  let variantClasses = "";
  switch (props.variant) {
    case "save":
      variantClasses = "bg-save hover:bg-green-600";
      break;
    case "outlined":
      variantClasses =
        "bg-transparent border border-primary text-sky-700 text-primary";
      break;
    case "danger":
      variantClasses = "bg-red-500 hover:bg-red-600";
      break;
    default:
      variantClasses = "bg-primary hover:bg-sky-700";
      break;
  }

  return `${baseClasses} ${sizeClasses} ${variantClasses}`;
});
</script>
