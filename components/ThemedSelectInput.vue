<template>
  <div class="flex flex-col" v-bind="$attrs">
    <label
      :for="id"
      :class="`block text-md font-medium ${instructions ? 'mb-1' : 'mb-2'}`"
      v-if="label"
    >
      {{ label }}<span v-if="required" class="text-red-500">*</span>
    </label>
    <p v-if="instructions" class="text-xs mb-2 text-slate-500 italic">
      {{ instructions }}
    </p>
    <!-- Single-select: use Davis Select -->
    <Select
      v-if="!multiple"
      :name="id"
      :model-value="(value as string)"
      :options="options.map((o) => ({ label: o.label, value: o.value }))"
      :placeholder="placeholder"
      :required="required"
      @update:model-value="$emit('update:value', $event)"
    />
    <!-- Multi-select: use @vueform/multiselect (Davis does not support multi-select).
         It is not SSR/hydration-safe (throws in beforeMount), so render it client-only.
         SSR and the first client render both emit a comment placeholder, keeping
         hydration in sync; the widget mounts afterwards. -->
    <VueMultiSelect
      v-else-if="isMounted"
      v-bind="msprops"
      v-model="_multiValue"
      :options="options"
      mode="tags"
      :max="max"
      :placeholder="placeholder"
      class="!shadow-none"
      :classes="{ tag: '!bg-sky-700' }"
    >
      <template #tag="{ option, handleTagRemove, disabled }">
        <div class="multiselect-tag !bg-sky-700">
          {{ (option as any).label }}
          <span
            v-if="!disabled"
            class="multiselect-tag-remove"
            @click="($event) => { (handleTagRemove as any)(option, $event); }"
          >
            <span class="multiselect-tag-remove-icon" />
          </span>
        </div>
      </template>
    </VueMultiSelect>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { Select } from '@libretexts/davis-vue';
import VueMultiSelect from '@vueform/multiselect';

// @vueform/multiselect must not render during SSR/hydration; gate it until mount.
const isMounted = ref(false);
onMounted(() => {
  isMounted.value = true;
});

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
    required: false,
    options: () => [],
    multiple: false,
    max: undefined,
    msprops: {},
  },
);

const _multiValue = computed({
  get: () => props.value as string[],
  set: (v: string[]) => emits('update:value', v),
});
</script>
<style src="@vueform/multiselect/themes/default.css"></style>
