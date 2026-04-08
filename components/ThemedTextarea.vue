<template>
  <div class="flex flex-col" v-bind="$attrs">
    <Textarea
      :name="id"
      :label="label"
      :placeholder="placeholder"
      :helper-text="instructions"
      :model-value="modelValue"
      :required="required"
      :rows="rows"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <div
      v-if="showCharacterCount && maxlength"
      class="flex justify-end text-xs text-slate-500"
    >
      <span>{{ modelValue.length }}</span>
      <span> / </span>
      <span>{{ maxlength }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Textarea } from '@libretexts/davis-vue';
defineEmits(['update:modelValue']);
withDefaults(
  defineProps<{
    id: string;
    label?: string;
    placeholder?: string;
    instructions?: string;
    modelValue?: string;
    type?: string;
    required?: boolean;
    maxlength?: number;
    rows?: number;
    showCharacterCount?: boolean;
  }>(),
  {
    id: '',
    label: '',
    placeholder: '',
    instructions: '',
    modelValue: '',
    type: 'text',
    required: false,
    maxlength: 500,
    rows: 3,
    showCharacterCount: false,
  },
);
</script>
