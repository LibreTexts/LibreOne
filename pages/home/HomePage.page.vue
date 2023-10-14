<template>
  <StandardPageLayout fill-height>
    <LaunchpadComponent :authorized="isAuthorized" />
  </StandardPageLayout>
</template>

<script lang="ts" setup>
  import StandardPageLayout from '../../components/layout/StandardPageLayout.vue';
  import LaunchpadComponent from '../../components/LaunchpadComponent.vue';
  import { useAuthStatus } from '@renderer/useAuthStatus';

  const isAuthorized = useAuthStatus();
</script>
