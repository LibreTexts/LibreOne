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
    <textarea
      :id="id"
      :value="modelValue"
      :type="type"
      :required="required"
      :aria-required="required"
      :rows="rows"
      :maxlength="maxlength"
      @input="
        $emit('update:modelValue', ($event.target as HTMLInputElement).value)
      "
      :placeholder="placeholder"
      :class="[
        'border',
        'block',
        'min-h-10',
        'w-full',
        'rounded-md',
        'pt-2',
        'px-2',
        'placeholder:text-slate-400',
      ]"
    ></textarea>
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
