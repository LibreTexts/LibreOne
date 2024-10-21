<template>
  <div v-bind="$attrs">
    <div v-if="formStep === 1">
      <div class="flex justify-center mt-16 mb-12">
        <div
          :class="`flex flex-col p-4 rounded-sm max-w-lg ${statusClasses} shadow-md`"
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
      <form @submit.prevent="submitVerificationRequest">
        <ThemedInput
          id="bio_url_input"
          :label="$t('instructor.biourl')"
          :instructions="$t('instructor.biourl_desc')"
          v-model="bioURL"
          placeholder="https://example.com/my-bio"
          class="my-4"
        />
        <ThemedTextarea
          id="add_info_input"
          :label="$t('instructor.addtl_info')"
          :instructions="$t('instructor.addtl_info_desc')"
          v-model="addtlInfo"
          placeholder="Additional information"
          class="my-4"
          :maxlength="500"
          :showCharacterCount="true"
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
          :instructions="$t('instructor.applications_desc')"
            v-if=!isVerified
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
          :msprops="{closeOnSelect: true}"
        />
        <p v-if="didSelectADAPT" class="italic">
          <span class="text-blue-600 font-bold">{{ $t('common.note') }}:</span> {{ $t('instructor.adapt_note') }}
        </p>
        <ThemedSelectInput
          id="libs_select_input"
          :label="$t('instructor.special_libraries')"
          :placeholder="$t('instructor.special_libraries_placeholder')"
          :instructions="$t('instructor.special_libraries_desc')"
          :options="
            specialLibs.map((app) => {
              return {
                label: app.name,
                value: app.id,
              };
            })
          "
          v-model:value="selectedSpecialLibs"
          v-if=!isVerified
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
  import ThemedTextarea from '../ThemedTextarea.vue';
  import { Application } from '../../server/types/applications';
  import { isInstructorVerificationStatus } from '@renderer/utils/typeHelpers';
  import { useI18n } from 'vue-i18n';
  import { useAxios } from '@renderer/useAxios';
  import joi from 'joi';
  import { usePageContext } from '@renderer/usePageContext';

  // Props & Hooks
  const { t } = useI18n();
  const axios = useAxios();
  const pageContext = usePageContext();
  const isVerified = pageContext?.user?.verify_status == 'verified';
  const props = withDefaults(
    defineProps<{
      status?: string;
      applications?: Application[];
    }>(),
    {
      status: 'not_attempted',
      applications: () => [],
    },
  );

  // Data & UI
  const formStep = ref(1);
  const formValid = ref(false);
  const bioURL = ref('');
  const addtlInfo = ref('');
  //const registrationCode = ref('');
  const selectedApps = ref<string[]>([]);
  const selectedSpecialLibs = ref<string[]>([]);
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

  const availableApps = computed(() => {
    return props.applications?.filter((app: Application) => {
      return (
        app.app_type === 'standalone' &&
        app.default_access === 'none'
      );
    }) ?? [];
  });
  const specialLibs = computed(() => {
    return props.applications?.filter((app: Application) => {
      return app.app_type === 'library' && app.is_default_library === false;
    }) ?? [];
  });

  const didSelectADAPT = computed(() => {
    const foundID = availableApps.value.find((app) => app.name.toLowerCase() === 'adapt');
    if(!foundID) return false;
    return selectedApps.value.includes(foundID.id);
  })

  // Watchers
  watch(
    () => [selectedApps.value, selectedSpecialLibs.value, bioURL.value, addtlInfo.value],
    () => {
      formValid.value = validateForm(false);
    },
  );

  // Methods
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

    // Addtl Info OR Bio URL is required
    if (!addtlInfo.value.trim() && !bioURL.value.trim()) {
      if (setErrors) {
        validationErrors.value.push(t('instructor.no_bio_addtl_info'));
      }
      isValid = false;
    }

    // If Bio URL is provided, it must be a valid URL
    if (bioURL.value.trim() && !isValidUrl(bioURL.value.trim())) {
      if (setErrors) {
        validationErrors.value.push(t('instructor.biourl_invalid'));
      }
      isValid = false;
    }

    // If Addtl Info is provided, it must be between 5 and 500 characters
    if (addtlInfo.value.trim() && (addtlInfo.value.trim().length < 5 ||addtlInfo.value.trim().length > 500)) {
      if (setErrors) {
        validationErrors.value.push(t('instructor.addtl_info_max'));
      }
      isValid = false;
    }
    return isValid;
  }

  async function submitVerificationRequest() {
    try {
      isLoading.value = true;
      requestError.value = '';
      if(!pageContext.user?.uuid) throw new Error('badcontext');
      if (!validateForm(true)) return;

      const res = await axios.post(`/users/${pageContext.user.uuid}/verification-request`, {
        bio_url: bioURL.value.trim(),
        addtl_info: addtlInfo.value.trim(),
        ...((selectedApps.value.length || selectedSpecialLibs.value.length) && {
          applications: [...selectedApps.value, ...selectedSpecialLibs.value],
        }),
        //registration_code: registrationCode.value,
      });
      if (!res || res.data.err) throw new Error('badres');

      window.location.reload();
    } catch (err) {
      console.error(err);
      requestError.value = t('common.unknownerror');
    } finally {
      isLoading.value = false;
    }
  }
</script>
