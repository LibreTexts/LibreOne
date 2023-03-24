<template>
  <div
    aria-live="polite"
    :aria-busy="loading"
  >
    <h1 class="text-center text-3xl font-medium">
      {{ $t('register.verify_header') }}
    </h1>
    <i18n-t
      keypath="register.verify_message"
      tag="p"
      class="mt-6 text-center"
    >
      <template #email>
        <strong>{{ email }}</strong>
      </template>
    </i18n-t>
    <form @submit="submitForm">
      <div class="lg:my-6">
        <label
          for="code_input"
          class="block text-sm font-medium"
        >
          {{ $t('register.verify_code') }}
        </label>
        <input
          id="code_input"
          name="code"
          type="text"
          pattern="[0-9]*"
          inputmode="numeric"
          placeholder="123456"
          required
          v-model="code"
          :class="['border', codeErr ? 'border-red-600' : 'border-gray-300', 'block', 'h-10', 'mt-2', 'w-full', 'rounded-md', 'px-2', 'placeholder:text-slate-400', 'placeholder:font-light']"
        >
      </div>
      <p
        v-if="verifyErr"
        class="text-error font-medium text-center mt-4 mb-6"
      >
        {{ $t('register.verify_invalid') }}
      </p>
      <button
        type="submit"
        class="inline-flex items-center justify-center h-10 bg-primary p-2 mt-2 rounded-md text-white w-full font-medium hover:bg-sky-700 hover:shadow"
      >
        <template v-if="!loading">
          <span>{{ $t('common.continue') }}</span>
          <FontAwesomeIcon
            icon="fa-solid fa-circle-arrow-right"
            class="ml-2"
          />
        </template>
        <template v-else>
          <LoadingIndicator />
          <span class="ml-2">{{ $t('register.registering') }}</span>
        </template>
      </button>
    </form>
    <p class="text-xs text-center text-gray-500 mt-4">
      {{ $t('register.verify_thanks') }}
    </p>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { useAxios } from '@renderer/useAxios';
  import LoadingIndicator from '@components/LoadingIndicator.vue';

  const props = defineProps<{
    email: string;
  }>();
  const axios = useAxios();

  const code = ref('');
  const codeErr = ref(false);
  const verifyErr = ref(false);

  const loading = ref(false);

  /**
   * Resets any active error states in the form.
   */
  function resetFormErrors() {
    codeErr.value = false;
    verifyErr.value = false;
  }

  /**
   * Validates all fields in the form and sets error states, if necessary.
   */
  function validateForm() {
    let valid = true;
    if (Number.isNaN(Number.parseInt(code.value))) {
      valid = false;
      codeErr.value = true;
    }
    return valid;
  }

  /**
   * Submits the data to the server if all fields are valid and redirects to the onboarding URL.
   *
   * @param e - Form submission event.
   */
  async function submitForm(e: Event) {
    e.preventDefault();
    resetFormErrors();
    if (!validateForm()) {
      return;
    }
    loading.value = true;
    try {
      await axios.post('/auth/verify-email', {
        email: props.email,
        code: code.value,
      });
      loading.value = false;
      window.location.assign('/complete-registration');
    } catch (e) {
      console.log(e);
      loading.value = false;
      verifyErr.value = true;
    }
  }

</script>