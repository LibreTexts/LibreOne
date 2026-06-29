<template>
  <div
    aria-live="polite"
    :aria-busy="loading"
  >
    <Heading :level="3" class="text-center">
      {{ $t('register.header') }}
    </Heading>
    <p class="mt-2 text-center">
      {{ $t('register.infoline') }}
    </p>
    <div class="mt-6 flex flex-col-reverse lg:flex-row lg:divide-x lg:divide-slate-200">
      <div class="basis-2/3 px-4 py-2">
        <form
          class="lg:mt-4"
          @submit="submitForm"
        >
          <div class="lg:my-4">
            <Input
              name="email_input"
              type="email"
              :label="$t('common.email')"
              :placeholder="$t('common.email_placeholder')"
              v-model="email"
              :error="emailErr"
              required
            />
          </div>
          <div class="my-4">
            <Input
              name="pass_input"
              :type="showPassword ? 'text' : 'password'"
              :label="$t('common.password')"
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
          <p
            v-if="unknownError"
            class="text-error font-medium text-center mt-4 mb-6"
          >
            {{ $t('common.unknownerror') }}
          </p>
          <i18n-t
            v-if="accountExists"
            keypath="register.accountexists"
            tag="p"
            class="text-warning font-medium text-center mt-4 mb-6"
          >
            <template #signin>
              <a
                :href="loginURL"
                class="text-neutral font-semibold"
              >
                {{ $t('common.signin').toLocaleLowerCase() }}
              </a>
            </template>
            <template #resetpassword>
              <a
                :href="recoveryURL"
                class="text-neutral font-semibold"
              >
                {{ $t('register.resetpassword_friendly').toLocaleLowerCase() }}
              </a>
            </template>
          </i18n-t>
          <Button
            type="submit"
            full-width
            :loading="loading"
            :disabled="loading || invalidForm"
            class="mt-2"
          >
            {{ $t('register.create') }}
          </Button>
        </form>
      </div>
      <div class="flex py-5 px-5 items-center lg:hidden">
        <div class="flex-grow border-t border-slate-200" />
        <span class="flex-shrink mx-4 text-gray-400">{{ $t('common.or').toLocaleUpperCase() }}</span>
        <div class="flex-grow border-t border-slate-200" />
      </div>
      <div class="basis-1/3 px-4 py-2 text-gray-500">
        <p class="hidden lg:block">
          {{ $t('register.ordelegated') }}
        </p>
        <div class="lg:mt-4 space-y-3">
          <a
            class="w-full border rounded-md h-12 shadow-sm flex items-center p-2 hover:bg-slate-100 hover:shadow-md"
            :href="googleRegisterURL"
          >
            <img
              src="@renderer/google_icon.png"
              alt=""
              class="h-8"
            >
            <span class="font-medium text-slate-700 ml-2">{{ $t('register.usegoogle') }}</span>
          </a>
          <a
            class="w-full border rounded-md h-12 shadow-sm flex items-center p-2 hover:bg-slate-100 hover:shadow-md"
            :href="microsoftRegisterURL"
          >
            <img
              src="@renderer/microsoft_icon.png"
              alt=""
              class="h-8"
            >
            <span class="font-medium text-slate-700 ml-2">{{ $t('register.usemicrosoft') }}</span>
          </a>
        </div>
      </div>
    </div>
    <div class="mt-8">
      <i18n-t
        keypath="register.legalnotice"
        tag="p"
        class="text-gray-500 text-center text-sm my-2"
      >
        <template #privpolicy>
          <a
            href="https://libretexts.org/privacy"
            target="_blank"
            rel="noreferer"
            class="text-accent"
          >
            {{ $t('common.privpolicy') }}
          </a>
        </template>
        <template #tos>
          <a
            href="https://libretexts.org/terms-of-service/"
            target="_blank"
            rel="noreferer"
            class="text-accent"
          >
            {{ $t('common.tos') }}
          </a>
        </template>
      </i18n-t>
      <div class="mt-4 text-center text-sm flex justify-center items-center">
        <p>
          {{ $t('register.existingaccount') }}
          <a
            class="text-accent font-medium"
            :href="loginURL"
          >
            {{ $t('common.signin') }}
          </a>
        </p>
        <span class="ml-2 mr-2 text-gray-500">&middot;</span>
        <p>
          {{ $t('register.forgotpassword') }}
          <a
            class="text-accent font-medium"
            :href="recoveryURL"
          >
            {{ $t('register.resetpassword') }}
          </a>
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import { AxiosError } from 'axios';
  import { useAxios } from '@renderer/useAxios';
  import { Heading, Input, Button } from '@libretexts/davis-vue';
  import PasswordStrengthMeter from '@components/PasswordStrengthMeter.vue';
  import { getPasswordStrength } from '@renderer/utils/auth';

  defineProps<{
    loginURL: string;
    recoveryURL: string;
    googleRegisterURL: string;
    microsoftRegisterURL: string;
  }>();
  const emit = defineEmits<{
    (e: 'register', email: string): void;
  }>();
  const axios = useAxios();

  const email = ref('');
  const password = ref('');

  const loading = ref(false);
  const emailErr = ref(false);
  const passErr = ref(false);
  const accountExists = ref(false);
  const unknownError = ref(false);
  const showPassword = ref(false);
  const passStrength = computed(() => getPasswordStrength(password.value));
  const invalidForm = computed(() => {
    return (email.value.trim().length < 3 || email.value.trim().length > 320 || !email.value.includes('@')) ||
      passStrength.value < 3;
  });

  function toggleShowPassword() {
    showPassword.value = !showPassword.value;
  }

  function resetFormErrors() {
    emailErr.value = false;
    passErr.value = false;
  }

  function validateForm() {
    let valid = true;
    if (email.value.trim().length < 3 || email.value.trim().length > 320 || !email.value.includes('@')) {
      valid = false;
      emailErr.value = true;
    }
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
      const result = await axios.post('/auth/register', {
        email: email.value,
        password: password.value,
      });
      if (result.data.data?.uuid) {
        loading.value = false;
        emit('register', email.value);
      }
    } catch (e) {
      loading.value = false;
      if (e instanceof AxiosError && e.response?.status === 409) {
        accountExists.value = true;
      } else {
        unknownError.value = true;
      }
    }
  }
</script>
