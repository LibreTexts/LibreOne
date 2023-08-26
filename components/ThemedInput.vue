<template>
  <div
    class="flex flex-col"
    v-bind="$attrs"
  >
    <label
      :for="id"
      :class="`block text-sm font-medium ${instructions ? 'mb-1' : 'mb-2'}`"
      v-if="label"
    >
      {{ label }}<span
        v-if="required"
        class="text-red-500"
      >*</span>
    </label>
    <p
      v-if="instructions"
      class="text-xs mb-2 text-slate-500 italic"
    >
      {{ instructions }}
    </p>
    <input
      :id="id"
      :value="modelValue"
      :type="type"
      :required="required"
      :aria-required="required"
      @input="
        $emit('update:modelValue', ($event.target as HTMLInputElement).value)
      "
      :placeholder="placeholder"
      :class="[
        'border',
        'block',
        'h-10',
        'w-full',
        'rounded-md',
        'px-2',
        'placeholder:text-slate-400',
      ]"
    >
  </div>
</template>

<script lang="ts" setup>
  import { defineProps } from 'vue';
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
