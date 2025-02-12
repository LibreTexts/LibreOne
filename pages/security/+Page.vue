<template>
  <StandardPageLayout>
    <div aria-live="polite">
      <AccountPendingDeletionBanner :deletionDate="props.deletionDate" v-if="props.pendingDeletion"/>
      <div class="mb-4">
        <h1 class="text-left text-3xl font-medium">
          {{ $t("security.security") }}
        </h1>
        <p class="mt-2 text-left text-slate-500">
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
          :pendingDeletion="props.pendingDeletion"
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
  import AccountPendingDeletionBanner from '@components/account_management/AccountPendingDeletionBanner.vue';
  import { usePageProps } from '@renderer/usePageProps';

  const pageContext = usePageContext().value;
  const props = usePageProps<{
    pendingDeletion?: boolean;
    deletionDate?: string;
  }>();

  const unknownerror = ref(false);

  const handleDataUpdated = () => {
    window.location.reload();
  };
</script>
