<template>
  <StandardPageLayout fill-height>
    <LaunchpadComponent
      :authorized="isAuthorized"
      :public-apps="props.publicApps"
    />
  </StandardPageLayout>
</template>

<script lang="ts" setup>
  import StandardPageLayout from '../../components/layout/StandardPageLayout.vue';
  import LaunchpadComponent from '../../components/LaunchpadComponent.vue';
  import { useAuthStatus } from '@renderer/useAuthStatus';
  import { Application } from '@server/types/applications';
  import { usePageProps } from '@renderer/usePageProps';

  const props = usePageProps<{ publicApps?: Application[] }>()
  const isAuthorized = useAuthStatus();
</script>
