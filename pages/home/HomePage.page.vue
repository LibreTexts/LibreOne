<template>
  <StandardPageLayout fill-height>
    <LaunchpadComponent
      :authorized="isAuthorized"
      :public-apps="$props.publicApps"
    />
  </StandardPageLayout>
</template>

<script lang="ts" setup>
  import StandardPageLayout from '../../components/layout/StandardPageLayout.vue';
  import LaunchpadComponent from '../../components/LaunchpadComponent.vue';
  import { useAuthStatus } from '@renderer/useAuthStatus';
  import { Application } from '@server/types/applications';

  defineProps<{ publicApps?: Application[] }>();
  const isAuthorized = useAuthStatus();
</script>
