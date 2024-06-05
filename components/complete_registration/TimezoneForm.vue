<template>
  <h1 class="text-center text-3xl font-medium">
    {{ $t("complete_registration_timezone.header") }}
  </h1>
  <p class="text-center mt-4">
    {{ $t("complete_registration_timezone.tagline") }}
  </p>
  <p class="text-center mt-1 mb-4 text-sm text-gray-500">
    {{ $t("complete_registration_timezone.tagline_note") }}
  </p>
  <template v-if="!loading">
    <div class="lg:my-4">
      <div>
        <ThemedSelectInput
          id="timezone_select_input"
          :label="$t('complete_registration_timezone.timezone')"
          :placeholder="$t('common.select')"
          :options="
            TimezoneOpts.map((tz) => {
              return {
                label: tz.text,
                value: tz.value,
              };
            })
          "
          v-model:value="timezone"
          class="my-4"
          :msprops="{openDirection: 'top', searchable: true, closeOnSelect: true}"
        />
      </div>
    </div>
    <ThemedButton
      type="submit"
      @click="handleSubmit"
      class="mt-6"
      :loading="loading"
    >
      {{ $t("common.submit") }}
    </ThemedButton>
  </template>
  <div
    v-else
    class="flex items-center justify-center p-8"
  >
    <LoadingIndicator class="!h-8 !w-8" />
  </div>
  
  
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  import { useAxios } from '@renderer/useAxios';
  import LoadingIndicator from '@components/LoadingIndicator.vue';
  import ThemedSelectInput from '../ThemedSelectInput.vue';
  import ThemedButton from '../ThemedButton.vue';
  import { TimezoneOpts } from '@renderer/utils/timezones';
  import { usePageContext } from '@renderer/usePageContext';
  const pageContext = usePageContext();

  // Local Types
  type TimezonePatch = {
    time_zone: string;
  };

  // Props & Hooks
  const props = defineProps<{
    uuid: string;
  }>();
  const axios = useAxios();

  // UI & Data
  const loading = ref(false);
  const timezone = ref('');

  // Methods

  /**
   * Validates the timezone selection and requests a timezone update.
   */
  function handleSubmit() {
    // Timezone is required
    if (timezone.value) {
      submitTimezone({ time_zone: timezone.value.toString() });
    }
  }

  /**
   * Submits the timezone update to the server and redirects to init an SSO session.
   *
   * @param {TimezonePatch} data - Timezone information to submit.
   */
  async function submitTimezone(data: TimezonePatch) {
    try {
      loading.value = true;
      await axios.patch(`/users/${props.uuid}`, data);

      const finishResult = await axios.post('/auth/complete-registration');
      if (finishResult.data.data?.initSessionURL) {
        window.location.assign(finishResult.data.data.initSessionURL);
      }
    } catch (e) {
      loading.value = false;
    } finally {
      loading.value = false;
    }
  }
</script>
