<template>
  <form
    class="flex flex-col gap-5"
    novalidate
    @submit="submitForm"
  >
    <div class="flex flex-col gap-1.5">
      <p class="text-sm font-medium text-zinc-600">
        {{ $t('register.step', { current: 1, total: 2 }) }}
      </p>
      <Heading
        :level="1"
        class="!text-3xl"
      >
        {{ $t('register.create_header') }}
      </Heading>
      <p class="hidden text-base text-zinc-600 md:block">
        <i18n-t keypath="register.already_short">
          <template #signin>
            <a
              :href="loginUrl"
              class="font-medium text-primary"
            >{{ $t('common.signin') }}</a>
          </template>
        </i18n-t>
      </p>
    </div>

    <div class="grid grid-cols-2 gap-2.5">
      <Button
        as="a"
        variant="outline"
        full-width
        :href="googleRegisterUrl"
      >
        <template #icon>
          <img
            src="@renderer/google_icon.png"
            alt=""
            class="h-5 w-5"
          >
        </template>
        Google
      </Button>
      <Button
        as="a"
        variant="outline"
        full-width
        :href="microsoftRegisterUrl"
      >
        <template #icon>
          <img
            src="@renderer/microsoft_icon.png"
            alt=""
            class="h-5 w-5"
          >
        </template>
        Microsoft
      </Button>
    </div>

    <div
      class="flex items-center gap-3 text-sm text-zinc-500"
      role="separator"
    >
      <span class="h-px flex-1 bg-zinc-200" />
      {{ $t('common.or') }}
      <span class="h-px flex-1 bg-zinc-200" />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <Input
        name="first_name"
        autocomplete="given-name"
        :label="$t('profile.firstname')"
        v-model="firstName"
        :error="Boolean(firstNameError)"
        :error-message="firstNameError"
        required
      />
      <Input
        name="last_name"
        autocomplete="family-name"
        :label="$t('profile.lastname')"
        v-model="lastName"
        :error="Boolean(lastNameError)"
        :error-message="lastNameError"
        required
      />
    </div>

    <Input
      name="email"
      type="email"
      autocomplete="email"
      :label="$t('common.email')"
      :placeholder="$t('common.email_placeholder')"
      v-model="email"
      :error="Boolean(emailError) || accountExists"
      :error-message="emailError"
      required
    />
    <p
      v-if="accountExists"
      class="text-sm font-medium text-warning"
      role="alert"
    >
      <i18n-t keypath="register.accountexists_short">
        <template #signin>
          <a
            :href="loginUrl"
            class="font-semibold text-primary underline"
          >{{ $t('common.signin') }}</a>
        </template>
      </i18n-t>
    </p>

    <div class="flex flex-col gap-2">
      <Input
        name="password"
        :type="showPassword ? 'text' : 'password'"
        autocomplete="new-password"
        :label="$t('common.password')"
        :placeholder="$t('register.password_placeholder')"
        v-model="password"
        :error="Boolean(passwordError)"
        :error-message="passwordError"
        required
      />
      <button
        type="button"
        class="self-start text-xs text-zinc-500 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        @click="showPassword = !showPassword"
      >
        {{ showPassword ? $t('common.hide') : $t('common.show') }} {{ $t('common.password') }}
      </button>
      <div
        class="grid grid-cols-4 gap-1"
        role="meter"
        :aria-valuemin="0"
        :aria-valuemax="4"
        :aria-valuenow="passStrength"
        :aria-label="$t('password.strength')"
      >
        <span
          v-for="bar in 4"
          :key="bar"
          class="h-1 rounded-full"
          :class="bar <= filledBars ? barColor : 'bg-zinc-200'"
        />
      </div>
      <p
        v-if="password.length > 0"
        class="text-sm font-medium"
        :class="passStrength >= 3 ? 'text-success' : passStrength === 2 ? 'text-warning' : 'text-error'"
        aria-live="polite"
      >
        {{ strengthLabel }}
      </p>
    </div>

    <p
      v-if="unknownError"
      class="text-sm font-medium text-error"
      role="alert"
    >
      {{ $t('common.unknownerror') }}
    </p>

    <Button
      type="submit"
      full-width
      class="max-md:min-h-12"
      :loading="loading"
      :disabled="loading"
    >
      {{ $t('common.continue') }}
    </Button>

    <i18n-t
      keypath="register.legalnotice"
      tag="p"
      class="text-sm leading-normal text-zinc-600"
    >
      <template #privpolicy>
        <a
          href="https://libretexts.org/privacy"
          target="_blank"
          rel="noreferrer"
          class="text-primary"
        >
          {{ $t('common.privpolicy') }}
        </a>
      </template>
      <template #tos>
        <a
          href="https://libretexts.org/terms-of-service/"
          target="_blank"
          rel="noreferrer"
          class="text-primary"
        >
          {{ $t('common.tos') }}
        </a>
      </template>
    </i18n-t>

    <p class="text-center text-sm text-zinc-600 md:hidden">
      <i18n-t keypath="register.existingaccount_prompt">
        <template #signin>
          <a
            :href="loginUrl"
            class="font-medium text-primary"
          >{{ $t('common.signin') }}</a>
        </template>
      </i18n-t>
    </p>
  </form>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import { AxiosError } from 'axios';
  import { useI18n } from 'vue-i18n';
  import { Button, Heading, Input } from '@libretexts/davis-vue';
  import { useAxios } from '@renderer/useAxios';
  import { getPasswordStrength } from '@renderer/utils/auth';
  import type { RegistrationAccount } from './types';

  const props = defineProps<{
    loginUrl: string;
    googleRegisterUrl: string;
    microsoftRegisterUrl: string;
    initialFirstName?: string;
    initialLastName?: string;
    initialEmail?: string;
    emailTaken?: boolean;
  }>();

  const emit = defineEmits<{
    (e: 'continue', account: RegistrationAccount): void;
  }>();

  const { t } = useI18n();
  const axios = useAxios();

  const firstName = ref(props.initialFirstName ?? '');
  const lastName = ref(props.initialLastName ?? '');
  const email = ref(props.initialEmail ?? '');
  const password = ref('');
  const showPassword = ref(false);
  const loading = ref(false);
  const accountExists = ref(props.emailTaken ?? false);
  const unknownError = ref(false);
  const firstNameError = ref('');
  const lastNameError = ref('');
  const emailError = ref('');
  const passwordError = ref('');

  const passStrength = computed(() => getPasswordStrength(password.value));
  const filledBars = computed(() => {
    if (!password.value) return 0;
    return Math.min(4, Math.max(passStrength.value, 1));
  });
  const barColor = computed(() => {
    if (passStrength.value >= 3) return 'bg-success';
    if (passStrength.value === 2) return 'bg-warning';
    return 'bg-error';
  });
  const strengthLabel = computed(() => {
    const keys = ['short', 'veryweak', 'weak', 'good', 'strong'] as const;
    return t(`password.${keys[passStrength.value] ?? 'short'}`);
  });

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function resetErrors() {
    firstNameError.value = '';
    lastNameError.value = '';
    emailError.value = '';
    passwordError.value = '';
    accountExists.value = false;
    unknownError.value = false;
  }

  function validate(): boolean {
    let valid = true;
    if (!firstName.value.trim()) {
      firstNameError.value = t('register.first_name_required');
      valid = false;
    }
    if (!lastName.value.trim()) {
      lastNameError.value = t('register.last_name_required');
      valid = false;
    }
    const trimmedEmail = email.value.trim();
    if (!trimmedEmail) {
      emailError.value = t('register.email_required');
      valid = false;
    } else if (!emailPattern.test(trimmedEmail)) {
      emailError.value = t('register.email_invalid');
      valid = false;
    }
    if (password.value.length < 8) {
      passwordError.value = t('register.password_short');
      valid = false;
    } else if (passStrength.value < 3) {
      passwordError.value = t('register.password_weak');
      valid = false;
    }
    return valid;
  }

  async function submitForm(event: Event) {
    event.preventDefault();
    resetErrors();
    if (!validate()) return;
    loading.value = true;
    try {
      const result = await axios.post('/auth/check-email', { email: email.value.trim() });
      if (!result.data?.data?.available) {
        accountExists.value = true;
        loading.value = false;
        return;
      }
      emit('continue', {
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
        email: email.value.trim(),
        password: password.value,
      });
    } catch (error) {
      loading.value = false;
      if (error instanceof AxiosError && error.response?.status === 409) {
        accountExists.value = true;
        return;
      }
      unknownError.value = true;
    }
  }
</script>
