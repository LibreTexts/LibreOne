<template>
  <div
    class="flex flex-col"
    v-bind="$attrs"
  >
    <label
      :for="id"
      :class="`block text-md font-medium ${instructions ? 'mb-1' : 'mb-2'}`"
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
    <VueMultiSelect
      v-bind="msprops"
      v-model="_value"
      :options="options"
      :mode="multiple ? 'tags' : 'single'"
      :max="max"
      :placeholder="placeholder"
      class="!shadow-none"
      :classes="{
        tag: '!bg-sky-700',
      }"
    >
      <template #tag="{ option, handleTagRemove, disabled }">
        <div class="multiselect-tag !bg-sky-700">
          {{
            // @ts-ignore
            option.label
          }}
          <span
            v-if="!disabled"
            class="multiselect-tag-remove"
            @click="
              ($event) => {
                // @ts-ignore
                handleTagRemove(option, $event);
              }
            "
          >
            <span class="multiselect-tag-remove-icon" />
          </span>
        </div>
      </template>
    </VueMultiSelect>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue';
  import VueMultiSelect from '@vueform/multiselect';
  const emits = defineEmits<{
    (e: 'update:value', v: string | string[]): void;
  }>();
  const props = withDefaults(
    defineProps<{
      id: string;
      label?: string;
      instructions?: string;
      placeholder?: string;
      value?: string | string[];
      required?: boolean;
      options?: { label: string; value: string }[];
      multiple?: boolean;
      max?: number;
      msprops?: any;
    }>(),
    {
      id: '',
      label: '',
      instructions: '',
      placeholder: '',
      value: '',
      type: 'text',
      required: false,
      options: () => [],
      multiple: false,
      max: undefined,
      msprops: {},
    },
  );

  const _value = computed({
    get: () => {
      if (props.multiple) return props.value as string[];
      return props.value as string;
    },
    set: (v: string | string[]) => {
      if (props.multiple) return emits('update:value', v as string[]);
      return emits('update:value', v as string);
    },
  });
</script>
<style src="@vueform/multiselect/themes/default.css"></style>
