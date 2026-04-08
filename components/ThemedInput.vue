<template>
  <Checkbox
    v-if="type === 'checkbox'"
    v-bind="$attrs"
    :id="id"
    :name="id"
    :label="label"
    :model-value="(modelValue as boolean)"
    :required="required"
    @update:model-value="$emit('update:modelValue', $event)"
  />
  <Input
    v-else
    v-bind="$attrs"
    :name="id"
    :label="label"
    :placeholder="placeholder"
    :helper-text="instructions"
    :model-value="(modelValue as string)"
    :type="type"
    :required="required"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script lang="ts" setup>
import { Input, Checkbox } from '@libretexts/davis-vue';
defineEmits(['update:modelValue']);
withDefaults(
  defineProps<{
    id: string;
    label?: string;
    placeholder?: string;
    instructions?: string;
    modelValue?: string | boolean;
    type?: string;
    required?: boolean;
  }>(),
  {
    id: '',
    label: '',
    placeholder: '',
    instructions: '',
    modelValue: '',
    type: 'text',
    required: false,
  },
);
</script>
