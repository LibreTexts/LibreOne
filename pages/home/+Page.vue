<template>
  <StandardPageLayout fill-height>
    <LaunchpadComponent
      :authorized="isAuthorized"
      :public-apps="props.publicApps"
      :announcements="props.announcements"
    />
  </StandardPageLayout>
</template>

<script lang="ts" setup>
  import StandardPageLayout from '../../components/layout/StandardPageLayout.vue';
  import LaunchpadComponent from '../../components/LaunchpadComponent.vue';
  import { useAuthStatus } from '@renderer/useAuthStatus';
  import { Application } from '@server/types/applications';
  import { usePageProps } from '@renderer/usePageProps';
  import { Announcement } from '@server/models';

  const props = usePageProps<{ publicApps?: Application[]; announcements?: Announcement[] }>()
  const isAuthorized = useAuthStatus();
</script>
