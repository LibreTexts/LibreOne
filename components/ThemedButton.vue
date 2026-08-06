<template>
  <Button
    v-bind="$attrs"
    :variant="davisVariant"
    :size="props.small ? 'sm' : 'md'"
    :loading="props.loading"
    :disabled="props.disabled"
    :full-width="!props.small"
  >
    <component :is="iconMap[props.icon]" class="w-5 h-5 mr-2" v-if="props.icon && !props.loading" />
    <slot />
  </Button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Button } from "@libretexts/davis-vue";
import {
  IconKeyFilled,
  IconShoppingCart,
  IconShoppingCartFilled,
  IconPlayerPlayFilled,
  IconArrowRight,
} from "@tabler/icons-vue";

const iconMap = {
  IconKeyFilled,
  IconShoppingCart,
  IconShoppingCartFilled,
  IconPlayerPlayFilled,
  IconArrowRight,
};

const props = withDefaults(
  defineProps<{
    variant?: "default" | "save" | "outlined" | "danger";
    small?: boolean;
    disabled?: boolean;
    loading?: boolean;
    icon?: keyof typeof iconMap;
  }>(),
  {
    variant: "default",
    small: false,
    disabled: false,
    loading: false,
  }
);

const davisVariant = computed(() => {
  switch (props.variant) {
    case "save":
      return "primary";
    case "outlined":
      return "outline";
    case "danger":
      return "destructive";
    default:
      return "primary";
  }
});
</script>
