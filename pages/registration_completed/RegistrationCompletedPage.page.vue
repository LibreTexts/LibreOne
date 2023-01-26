<template>
  <div class="bg-zinc-100 grid grid-flow-col justify-items-center items-center min-h-screen py-10">
    <div class="w-11/12 md:w-3/4">
      <img
        src="@renderer/libretexts_logo.png"
        alt="LibreTexts"
        class="max-w-xs my-0 mx-auto"
      >
      <div class="bg-white p-6 mt-6 shadow-md shadow-gray-400 rounded-md overflow-hidden">
        <h1 class="text-center text-3xl font-medium">
          {{ $t('registration_complete.header') }}
        </h1>
        <p class="text-center mt-4">
          {{ $t('registration_complete.tagline') }}
        </p>
        <div
          v-if="hasRedirect && !isInstructor"
          class="flex items-center justify-center p-8"
        >
          <LoadingIndicator class="!h-8 !w-8" />
          <p class="mt-2">
            {{ $t('registration_complete.redirecting') }}
          </p>
        </div>
        <div v-else-if="isInstructor">
          <p class="m-8 text-center">
            {{ $t('registration_complete.instructor_guide') }}
          </p>
          <a
            href="https://commons.libretexts.org/account/instructorprofile"
            class="inline-flex items-center justify-center h-10 bg-primary p-2 mt-2 rounded-md text-white w-full font-medium hover:bg-sky-700 hover:shadow"
          >
            <span>{{ $t('common.continue') }}</span>
            <FontAwesomeIcon
              icon="fa-solid fa-circle-arrow-right"
              class="ml-2"
            />
          </a>
        </div>
        <div
          v-else
          class="mx-auto my-4 px-2 py-4 w-full sm:w-3/4"
        >
          <ApplicationsGrid />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, onMounted } from 'vue';
  import { usePageContext } from '@renderer/usePageContext';
  import ApplicationsGrid from '@components/ApplicationsGrid.vue';
  import LoadingIndicator from '@components/LoadingIndicator.vue';

  const props = defineProps<{
    redirectURI?: string;
  }>();
  const pageContext = usePageContext();
  const isInstructor = computed(() => pageContext.user?.user_type === 'instructor');
  const hasRedirect = computed(() => !!props.redirectURI);

  /**
   * Initiate an automatic redirect if one was passed in props.
   */
  onMounted(() => {
    if (hasRedirect.value) {
      setTimeout(() => {
        if (props.redirectURI) {
          window.location.assign(props.redirectURI);
        }
      }, 2500);
    }
  });

</script>