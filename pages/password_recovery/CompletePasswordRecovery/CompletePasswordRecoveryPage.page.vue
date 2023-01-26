<template>
  <div class="bg-zinc-100 grid grid-flow-col justify-items-center items-center min-h-screen py-10">
    <div class="w-11/12 lg:w-1/2">
      <img
        src="@renderer/libretexts_logo.png"
        alt="LibreTexts"
        class="max-w-xs my-0 mx-auto"
      >
      <div
        class="bg-white p-6 mt-6 shadow-md shadow-gray-400 rounded-md overflow-hidden"
        aria-live="polite"
        :aria-busy="loading"
      >
        <div v-if="!complete">
          <h1 class="text-3xl text-center font-medium lt:mt-2">
            {{ $t('passwordrecovery.completeheader') }}
          </h1>
          <p class="text-center mt-4">
            {{ $t('passwordrecovery.completetagline') }}
          </p>
          <form @submit="submitForm">
            <div class="mt-4">
              <label
                for="pass_input"
                class="block text-sm font-medium"
              >
                {{ $t('passwordrecovery.newpassword') }}
              </label>
              <div class="flex rounded-md h-10 mt-2">
                <input
                  id="pass_input"
                  :type="showPassword ? 'text' : 'password'"
                  aria-required="true"
                  v-model="password"
                  placeholder="********"
                  :class="['border', passErr ? 'border-red-600' : 'border-gray-300', 'h-full', 'w-full', 'rounded-md', 'rounded-r-none', 'px-2', 'block', 'flex-1', 'placeholder:text-slate-400', 'placeholder:font-light']"
                >
                <button
                  type="button"
                  @click="toggleShowPassword"
                  class="bg-gray-200 hover:bg-gray-300 w-10 h-full inline-flex border border-gray-300 border-l-0 items-center justify-center rounded-r-md"
                >
                  <FontAwesomeIcon :icon="['fa-solid', showPassword ? 'fa-eye-slash' : 'fa-eye']" />
                  <span class="sr-only">
                    {{ showPassword ? $t('common.hide') : $t('common.show') }} {{ $t('common.password') }}
                  </span>
                </button>
              </div>
              <div class="mt-1">
                <PasswordStrengthMeter
                  :strength="passStrength"
                />
              </div>
            </div>
            <i18n-t
              v-if="expired"
              keypath="passwordrecovery.expiredmessage"
              tag="p"
              class="text-error font-medium text-center mt-6"
            >
              <template #startreset>
                <a
                  :href="restartURI"
                  class="text-neutral"
                >
                  {{ $t('passwordrecovery.restart').toLocaleLowerCase() }}
                </a>
              </template>
            </i18n-t>
            <button
              type="submit"
              class="inline-flex items-center justify-center h-10 bg-primary p-2 mt-8 mb-2 rounded-md text-white w-full font-medium hover:bg-sky-700 hover:shadow"
            >
              <span v-if="!loading">{{ $t('passwordrecovery.setpassword') }}</span>
              <template v-else>
                <LoadingIndicator />
                <span class="ml-2">{{ $t('passwordrecovery.submitting') }}</span>
              </template>
            </button>
          </form>
        </div>
        <div v-else>
          <h1 class="text-3xl text-center font-medium mt-4 lg:mt-2">
            {{ $t('passwordrecovery.completedheader') }}
          </h1>
          <p class="text-center mt-6 mb-4">
            {{ $t('passwordrecovery.completedtagline') }}
          </p>
          <div
            v-if="willRedirect"
            class="flex flex-col items-center justify-center mt-8"
          >
            <LoadingIndicator class="!h-8 !w-8" />
            <p class="text-center italic my-4">
              {{ $t('passwordrecovery.redirecting') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
  import { AxiosError } from 'axios';
  import { useAxios } from '@renderer/useAxios';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import LoadingIndicator from '@components/LoadingIndicator.vue';
  import PasswordStrengthMeter from '@components/PasswordStrengthMeter.vue';
  import { passwordStrengthOptions } from '../../../passwordstrength';

  zxcvbnOptions.setOptions(passwordStrengthOptions);

  const props = defineProps<{
    token: string;
    successRedirectURI?: string;
    origRedirectURI?: string;
  }>();
  const axios = useAxios();

  const loading = ref(false);
  const showPassword = ref(false);
  const password = ref('');
  const passErr = ref(false);
  const complete = ref(false);
  const expired = ref(false);
  const willRedirect = ref(false);
  const passStrength = computed(() => zxcvbn(password.value).score);
  const restartURI = computed(() => {
    const params = new URLSearchParams({
      ...(props.origRedirectURI && { 
        redirect_uri: props.origRedirectURI,
      }),
    });
    return `/passwordrecovery?${params.toString()}`;
  });

  /**
   * Toggles between the show and hide password states.
   */
  function toggleShowPassword() {
    showPassword.value = !showPassword.value;
  }

  /**
   * Resets any active error states in the form.
   */
  function resetFormErrors() {
    passErr.value = false;
  }

  /**
   * Validates all form fields and sets any error states, if necessary.
   */
  function validateForm() {
    let valid = true;
    if (passStrength.value < 3) {
      valid = false;
      passErr.value = true;
    }
    return valid;
  }

  /**
   * Submits the reset token and new password to the server, then handles redirect
   * on success (if necessary).
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
      await axios.post('/auth/passwordrecovery/complete', {
        token: props.token,
        password: password.value,
      });
      loading.value = false;
      complete.value = true;
      if (props.successRedirectURI) {
        willRedirect.value = true;
        setTimeout(() => {
          if (props.successRedirectURI) {
            window.location.href = props.successRedirectURI;
          }
        }, 5000);
      }
    } catch (e) {
      loading.value = false;
      if (e instanceof AxiosError && e.response?.status === 400) {
        expired.value = true;
      } else {
        alert('Sorry, we seem to have encountered an error.');
      }
    }
  }

</script>