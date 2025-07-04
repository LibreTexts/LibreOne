<template>
  <StandardPageLayout>
    <div aria-live="polite">
      <SubscriptionsManager />
    </div>
  </StandardPageLayout>
</template>

<script lang="ts" setup>
import StandardPageLayout from '../../components/layout/StandardPageLayout.vue';
import SubscriptionsManager from '../../components/account_management/SubscriptionsManager.vue';
</script>