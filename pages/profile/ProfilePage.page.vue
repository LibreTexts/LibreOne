<template>
  <StandardPageLayout>
    <div aria-live="polite">
      <div class="mb-4">
        <h1 class="text-left text-3xl font-medium">
          {{ $t("profile.profile") }}
        </h1>
        <p class="mt-2 text-left">
          {{ $t("profile.infoline") }}
        </p>
      </div>
      <div class="flex flex-col mt-10">
        <p
          class="text-error font-medium text-center mb-4"
          v-if="unknownerror"
        >
          {{ $t("common.unknownerror") }}
        </p>
        <PersonalInfo
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
  import PersonalInfo from '../../components/account_management/PersonalInfo.vue';
  import { usePageContext } from '@renderer/usePageContext';
  import StandardPageLayout from '../../components/layout/StandardPageLayout.vue';

  const pageContext = usePageContext();

  const unknownerror = ref(false);

  const handleDataUpdated = () => {
    window.location.reload();
  };
</script>
