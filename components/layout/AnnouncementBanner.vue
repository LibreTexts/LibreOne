<template>
  <div
    :style="{ backgroundColor: $props.announcement.background_color, borderRadius: $props.rounded ? '0.375rem' : '0' }"
    class="flex text-white px-4 py-2.5 w-full justify-center items-center"
  >
    <div
      class="!text-white !text-base !font-semibold"
      v-html="cleanedContent"
    ></div>
  </div>
</template>

<script lang="ts" setup>
import { Announcement } from "@server/models";
import DOMPurify from "isomorphic-dompurify";

const props = defineProps<{
  announcement: Announcement;
  rounded?: boolean;
}>();

const cleanedContent = DOMPurify.sanitize(props.announcement.content);
</script>
