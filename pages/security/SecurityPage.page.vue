<template>
  <StandardPageLayout>
    <div aria-live="polite">
      <div class="mb-4">
        <h1 class="text-left text-3xl font-medium">
          {{ $t("security.security") }}
        </h1>
        <p class="mt-2 text-left">
          {{ $t("security.infoline") }}
        </p>
      </div>
      <div class="flex flex-col mt-10">
        <p
          class="text-error font-medium text-center mb-4"
          v-if="unknownerror"
        >
          {{ $t("common.unknownerror") }}
        </p>
        <SecurityInfo
          :user="pageContext.user"
          @data-updated="handleDataUpdated"
          @set-unknown-error="(val) => (unknownerror = val)"
        />
      </div>
    </div>
  </StandardPageLayout>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import StandardPageLayout from '@components/layout/StandardPageLayout.vue';
  import SecurityInfo from '@components/account_management/SecurityInfo.vue';
  import { usePageContext } from '@renderer/usePageContext';

  const pageContext = usePageContext();

  const unknownerror = ref(false);

  const handleDataUpdated = () => {
    window.location.reload();
  };
</script>
