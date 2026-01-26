<template>
  <div
    :class="type === 'checkbox' ? 'flex flex-row items-start' : 'flex flex-col'"
    v-bind="$attrs"
  >
    <label
      v-if="label && type !== 'checkbox'"
      :for="id"
      :class="`block text-sm font-medium ${instructions ? 'mb-1' : 'mb-2'}`"
    >
      {{ label }}<span
        v-if="required"
        class="text-red-500"
      >*</span>
    </label>
    <p
      v-if="instructions && type !== 'checkbox'"
      class="text-xs mb-2 text-slate-500 italic"
    >
      {{ instructions }}
    </p>
    <input
      :id="id"
      :checked="type === 'checkbox' ? (modelValue as boolean) : undefined"
      :value="type !== 'checkbox' ? (modelValue as string) : undefined"
      :type="type"
      :required="required"
      :aria-required="required"
      @input="
        type === 'checkbox'
          ? $emit('update:modelValue', ($event.target as HTMLInputElement).checked)
          : $emit('update:modelValue', ($event.target as HTMLInputElement).value)
      "
      :placeholder="placeholder"
      :class="[
        type === 'checkbox' 
          ? 'h-4 w-4 mt-0.5 mr-2 cursor-pointer flex-shrink-0' 
          : 'border block h-10 w-full rounded-md px-2 placeholder:text-slate-400',
      ]"
    >
    <label
      v-if="label && type === 'checkbox'"
      :for="id"
      class="text-sm font-normal cursor-pointer flex-1"
    >
      {{ label }}<span
        v-if="required"
        class="text-red-500"
      >*</span>
    </label>
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