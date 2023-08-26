<template>
  <div v-bind="$attrs">
    <div v-if="formStep === 1">
      <div class="flex justify-center mt-16 mb-12">
        <div
          :class="`flex flex-col p-4 rounded max-w-lg ${statusClasses} shadow`"
        >
          <p class="text-center text-lg font-medium">
            {{ $t("common.status") }}:
            {{ $t(`instructor.status_${typedStatus}`) }}
          </p>
          <p class="text-center text-md">
            {{ $t(`instructor.status_${typedStatus}_desc`) }}
          </p>
          <p
            class="text-center text-white text-xs mt-3 cursor-pointer"
            v-if="typedStatus === 'verified'"
          >
            <button
              class="underline"
              @click="handleStartForm"
            >
              I want to update my info
            </button>
          </p>
        </div>
      </div>
      <ThemedButton
        @click="handleStartForm"
        type="submit"
        class="mt-6"
        v-if="shouldShowStartButton"
      >
        {{ $t(getStartButtonTextKey) }}
      </ThemedButton>
    </div>
    <div
      v-if="formStep === 2"
      class="mt-8"
    >
      <form @submit="submitVerificationRequest">
        <ThemedInput
          id="bio_url_input"
          :label="$t('instructor.biourl')"
          :instructions="$t('instructor.biourl_desc')"
          aria-required="true"
          v-model="bioURL"
          placeholder="https://example.com/my-bio"
          class="my-4"
          required
        />
        <!--
        <ThemedInput
          id="register_code_input"
          :label="$t('instructor.registrationcode')"
          v-model="registrationCode"
          placeholder="0000"
          class="my-4"
        />
        -->
        <ThemedSelectInput
          id="apps_select_input"
          :label="$t('instructor.applications')"
          :placeholder="$t('instructor.applications_placeholder')"
          :instructions="
            $t('instructor.applications_desc') +
              ' ' +
              $t('instructor.one_app_or_lib')
          "
          :options="
            availableApps.map((app) => {
              return {
                label: app.name,
                value: app.id,
              };
            })
          "
          v-model:value="selectedApps"
          multiple
          class="my-4"
        />
        <ThemedSelectInput
          id="libs_select_input"
          :label="$t('instructor.libraries')"
          :placeholder="$t('instructor.libraries_placeholder')"
          :instructions="
            $t('instructor.libraries_desc') +
              ' ' +
              $t('instructor.one_app_or_lib')
          "
          :options="
            availableLibs.map((app) => {
              return {
                label: app.name,
                value: app.id,
              };
            })
          "
          v-model:value="selectedLibs"
          :max="3"
          multiple
          class="my-4"
        />
        <p
          class="text-center text-red-600 text-sm mt-2 font-bold"
          v-if="requestError"
        >
          {{ requestError }}
        </p>
        <p
          class="text-center text-red-600 text-sm mt-2 font-bold"
          v-if="validationErrors.length > 0"
        >
          {{ validationErrors.join(" ") }}
        </p>
        <ThemedButton
          type="submit"
          @click="submitVerificationRequest"
          class="mt-6"
          :loading="isLoading"
          :disabled="!formValid"
        >
          {{ $t("common.submit") }}
        </ThemedButton>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, watch } from 'vue';
  import ThemedButton from '../ThemedButton.vue';
  import ThemedInput from '../ThemedInput.vue';
  import ThemedSelectInput from '../ThemedSelectInput.vue';
  import { Application } from '../../server/types/applications';
  import { isInstructorVerificationStatus } from '@renderer/utils/typeHelpers';
  import { useI18n } from 'vue-i18n';
  import { useAxios } from '@renderer/useAxios';
  import joi from 'joi';

  const TEMP_APP_EXCLUSION_NAMES = ['Commons & Conductor (L1 Stage)'];

  // Props & Hooks
  const { t } = useI18n();
  const axios = useAxios();
  const props = withDefaults(
    defineProps<{
      status?: string;
    }>(),
    {
      status: 'not_attempted',
    },
  );

  // Init
  loadApps();

  // Data & UI
  const formStep = ref(1);
  const formValid = ref(false);
  const bioURL = ref('');
  //const registrationCode = ref('');
  const selectedApps = ref<string[]>([]);
  const selectedLibs = ref<string[]>([]);
  const availableApps = ref<Application[]>([]);
  const availableLibs = ref<Application[]>([]);
  const requestError = ref('');
  const validationErrors = ref<string[]>([]);
  const isLoading = ref(false);

  // Computed Values
  const typedStatus = computed(() => {
    if (isInstructorVerificationStatus(props.status)) {
      return props.status;
    }
    return 'not_attempted';
  });

  const statusClasses = computed(() => {
    switch (typedStatus.value) {
      case 'verified':
        return 'bg-green-700 text-white';
      case 'pending':
        return 'bg-blue-500 text-white';
      case 'needs_review':
      case 'denied':
        return 'bg-yellow-500 text-black';
      default:
        return 'bg-slate-100 text-black';
    }
  });

  const shouldShowStartButton = computed(() => {
    return !(typedStatus.value === 'verified' || typedStatus.value === 'pending');
  });

  const getStartButtonTextKey = computed(() => {
    switch (typedStatus.value) {
      case 'not_attempted':
        return 'instructor.startrequest';
      case 'denied':
      case 'needs_review':
      case 'verified':
        return 'instructor.restartrequest';
      default:
        return 'instructor.startrequest';
    }
  });

  // Watchers
  watch(
    () => [selectedApps.value, selectedLibs.value, bioURL.value],
    () => {
      formValid.value = validateForm(false);
    },
  );

  // Methods
  async function loadApps() {
    try {
      const res = await axios.get('/applications');
      if (!res || !res.data.data || !Array.isArray(res.data.data)) {
        throw new Error('badres');
      }

      availableApps.value = res.data.data.filter((app: Application) => {
        return (
          app.app_type === 'standalone' &&
          !TEMP_APP_EXCLUSION_NAMES.includes(app.name)
        );
      });
      availableLibs.value = res.data.data.filter((app: Application) => {
        return app.app_type === 'library';
      });
    } catch (err) {
      console.error(err);
      requestError.value = t('common.unknownerror');
    }
  }

  function handleStartForm() {
    formStep.value = 2;
  }

  function isValidUrl(str: string): boolean {
    const schema = joi.string().uri().required();
    const { error } = schema.validate(str);
    if (error) return false;
    return true;
  }

  /**
   * Validates the instructor verification form
   * @param {boolean} [setErrors=false] If validationErrors ref should be set with validation messages
   * @returns {boolean} Whether or not the form is valid
   */
  function validateForm(setErrors = false) {
    validationErrors.value = [];
    let isValid = true;
    if (!isValidUrl(bioURL.value)) {
      if (setErrors) {
        validationErrors.value.push(t('instructor.biourl_invalid'));
      }
      isValid = false;
    }
    if (selectedApps.value.length === 0 && selectedLibs.value.length === 0) {
      if (setErrors) {
        validationErrors.value.push(t('instructor.apps_or_libs_invalid'));
      }
      isValid = false;
    }
    return isValid;
  }

  async function submitVerificationRequest() {
    try {
      isLoading.value = true;
      requestError.value = '';
      if (!validateForm(true)) return;

      // TODO: Implement API call
      if (1 > 5) throw new Error('badres');

      window.location.reload();
    } catch (err) {
      console.error(err);
      requestError.value = t('common.unknownerror');
    } finally {
      isLoading.value = false;
    }
  }
</script>
