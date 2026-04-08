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
          <h1 class="text-3xl text-center font-semibold lt:mt-2">
            {{ $t('passwordrecovery.completeheader') }}
          </h1>
          <p class="text-center mt-4">
            {{ $t('passwordrecovery.completetagline') }}
          </p>
          <form @submit="submitForm">
            <div class="mt-4">
              <Input
                name="pass_input"
                :type="showPassword ? 'text' : 'password'"
                :label="$t('passwordrecovery.newpassword')"
                placeholder="********"
                v-model="password"
                :error="passErr"
                required
              />
              <button
                type="button"
                @click="toggleShowPassword"
                class="text-xs text-slate-500 mt-1 hover:underline"
              >
                {{ showPassword ? $t('common.hide') : $t('common.show') }} {{ $t('common.password') }}
              </button>
              <div class="mt-1">
                <PasswordStrengthMeter :strength="passStrength" />
              </div>
            </div>
            <i18n-t
              v-if="expired"
              keypath="passwordrecovery.expiredmessage"
              tag="p"
              class="text-error font-medium text-center mt-6"
            >
              <template #startreset>
                <a :href="restartURI" class="text-neutral">
                  {{ $t('passwordrecovery.restart').toLocaleLowerCase() }}
                </a>
              </template>
            </i18n-t>
            <Button
              type="submit"
              full-width
              :loading="loading"
              class="mt-8 mb-2"
            >
              {{ $t('passwordrecovery.setpassword') }}
            </Button>
          </form>
        </div>
        <div v-else>
          <h1 class="text-3xl text-center font-semibold mt-4 lg:mt-2">
            {{ $t('passwordrecovery.completedheader') }}
          </h1>
          <p class="text-center mt-6 mb-4">
            {{ $t('passwordrecovery.completedtagline') }}
          </p>
          <div
            v-if="willRedirect"
            class="flex flex-col items-center justify-center mt-8"
          >
            <Spinner size="lg" />
            <p class="text-center italic my-4">
              {{ $t('passwordrecovery.redirecting') }}
            </p>
          </div>
          <div
            v-else
            class="flex items-center justify-center mt-8 text-accent"
          >
            <FontAwesomeIcon icon="fa-solid fa-circle-arrow-left" />
            <i18n-t
              keypath="passwordrecovery.backtosource"
              tag="a"
              :href="props.signInURI"
              class="text-center ml-2"
            >
              <template #source>
                <a :href="props.signInURI">
                  {{ $t('common.signin') }}
                </a>
              </template>
            </i18n-t>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import { AxiosError } from 'axios';
  import { useAxios } from '@renderer/useAxios';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { Input, Button, Spinner } from '@libretexts/davis-vue';
  import PasswordStrengthMeter from '@components/PasswordStrengthMeter.vue';
  import { getPasswordStrength } from '@renderer/utils/auth';
  import { usePageProps } from '@renderer/usePageProps';

  const props = usePageProps<{
    token: string;
    signInURI: string;
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
  const passStrength = computed(() => getPasswordStrength(password.value));
  const restartURI = computed(() => {
    const params = new URLSearchParams({
      ...(props.origRedirectURI && { redirect_uri: props.origRedirectURI }),
    });
    return `/passwordrecovery?${params.toString()}`;
  });

  function toggleShowPassword() {
    showPassword.value = !showPassword.value;
  }

  function resetFormErrors() {
    passErr.value = false;
  }

  function validateForm() {
    let valid = true;
    if (passStrength.value < 3) {
      valid = false;
      passErr.value = true;
    }
    return valid;
  }

  async function submitForm(e: Event) {
    e.preventDefault();
    resetFormErrors();
    if (!validateForm()) return;
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
