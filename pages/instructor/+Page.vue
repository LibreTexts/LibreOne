<template>
  <StandardPageLayout>
    <div aria-live="polite">
      <!--Content Header-->
      <div class="flex justify-between">
        <div class="flex flex-col">
          <p class="text-3xl font-medium">
            {{ $t("instructor.yourprofile") }}
          </p>
          <p class="mt-2 text-slate-500">
            {{ $t("instructor.yourprofiletagline") }} {{ instructorStatus !== 'verified' ? $t("instructor.yourprofilerequirements") : '' }}
          </p>
        </div>
      </div>
      <!--Content Body-->
      <InstructorProfileForm
        :status="instructorStatus"
        :applications="props.applications"
      />
      <InstructorGettingStarted
        v-if="['verified', 'pending'].includes(instructorStatus ?? '')"
        class="mt-14"
      />
    </div>
  </StandardPageLayout>
</template>

<script lang="ts" setup>
  import { computed } from 'vue';
  import StandardPageLayout from '../../components/layout/StandardPageLayout.vue';
  import InstructorProfileForm from '../../components/instructor_profile/InstructorProfileForm.vue';
  import InstructorGettingStarted from '../../components/instructor_profile/InstructorGettingStarted.vue';
  import { usePageContext } from '@renderer/usePageContext';
  import { Application } from '@server/types/applications';
import { usePageProps } from '@renderer/usePageProps';

  const pageContext = usePageContext();
  const props = usePageProps<{ applications: Application[] }>()

  const instructorStatus = computed(() => {
    return pageContext.value.user?.verify_status;
  });
</script>
<style lang="css" scoped>
.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  grid-gap: 1rem;
  margin-top: 2rem;
}
.app-item-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-items: center;
  text-align: center;
  width: 12rem;
  height: 12rem;
  padding: 0.5rem;
  cursor: pointer;
}
.app-item-icon-container {
  display: flex;
  width: 75%;
  height: 60%;
  border-radius: 5px;
  background-color: #e5e7eb;
  align-items: center;
  justify-content: center;
}
.app-item-icon-container:hover {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}
.app-item-text-container {
  display: flex;
  flex-direction: column;
  text-align: center;
  margin-top: 0.75rem;
}
.app-item-header {
  font-size: 0.9rem;
  font-weight: 500;
}
.app-item-descrip {
  font-size: 0.7rem;
  color: #6b7280;
}
</style>
