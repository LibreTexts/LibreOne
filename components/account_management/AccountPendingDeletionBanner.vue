<template>
  <div class="p-4 mb-4 text-sm text-white rounded-lg bg-red-700" role="alert">
    <p class="font-medium">
      {{ $t("delete-account.pending_header") }}
    </p>
    <i18n-t keypath="delete-account.pending_infoline" tag="p" class="">
      <template #deletiondate v-if="deletionDate">
        <span>{{
          new Intl.DateTimeFormat("en-us", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(new Date(props.deletionDate))
        }}</span>
      </template>
      <template #supportlink>
        <a
          href="https://commons.libretexts.org/support/contact"
          rel="noreferer"
          target="_blank"
          class="font-semibold underline"
        >
          {{ $t("common.here") }}
        </a>
      </template>
    </i18n-t>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  deletionDate: string;
}>();
</script>
