<template>
  <div class="flex flex-col" v-bind="$attrs">
    <label :for="id" class="block text-sm font-medium" v-if="label">
      {{ label }}
    </label>
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
        'mt-2',
        'w-full',
        'rounded-md',
        'px-2',
        'placeholder:text-slate-400',
        'placeholder:font-light',
      ]"
    />
  </div>
</template>

<script lang="ts" setup>
import { defineProps } from "vue";
const props = withDefaults(
  defineProps<{
    id: string;
    label?: string;
    placeholder?: string;
    modelValue?: string;
    type?: string;
    required?: boolean;
  }>(),
  {
    id: "",
    label: "",
    placeholder: "",
    modelValue: "",
    type: "text",
    required: false,
  }
);
</script>
