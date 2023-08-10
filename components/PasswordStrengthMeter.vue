<template>
  <div class="w-full flex items-center">
    <div class="grow">
      <div :class="[strengthColor, strengthWidth, 'h-2', 'rounded-md', 'motion-safe:transition-width', 'motion-safe:duration-300']" />
    </div>
    <span
      class="ml-2 text-sm font-medium"
      aria-live="polite"
    >
      <span class="sr-only">{{ $t('password.strength') }}: </span>
      {{ strengthText }}
    </span>
  </div>
</template>

<script lang="ts" setup>
  import { ref, watch } from 'vue';
  import { useI18n } from 'vue-i18n';

  const STRENGTH_PROPS = {
    '0': { width: 'w-full', bg: 'bg-gray-300', textKey: 'short' },
    '1': { width: 'w-1/4', bg: 'bg-red-600', textKey: 'veryweak' },
    '2': { width: 'w-1/2', bg: 'bg-orange-600', textKey: 'weak' },
    '3': { width: 'w-3/4', bg: 'bg-yellow-300', textKey: 'good' },
    '4': { width: 'w-full', bg: 'bg-green-500', textKey: 'strong' },
  };

  const props = defineProps<{
    strength: number;
  }>();
  const { t } = useI18n();

  const strengthColor = ref(STRENGTH_PROPS['0'].bg);
  const strengthWidth = ref(STRENGTH_PROPS['0'].width);
  const strengthText = ref(t(`password.${STRENGTH_PROPS['0'].textKey}`));

  /**
   * Watches changes to the strength value passed in props and updates the meter's appearance.
   */
  watch(() => props.strength, (newStrength) => {
    const key = ((newStrength || 0).toString()) as keyof typeof STRENGTH_PROPS;
    strengthColor.value = STRENGTH_PROPS[key].bg;
    strengthWidth.value = STRENGTH_PROPS[key].width;
    strengthText.value = t(`password.${STRENGTH_PROPS[key].textKey}`);
  });

</script>