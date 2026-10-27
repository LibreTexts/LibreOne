<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-7 bg-zinc-100 px-5 py-12">
    <img
      src="@renderer/libretexts_logo.png"
      alt="LibreTexts"
      class="h-11"
    >
    <div class="w-full max-w-[440px] rounded-lg border border-zinc-200 bg-white p-8 shadow-md">
      <div
        class="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-sky-50 text-primary"
        aria-hidden="true"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2"
          />
          <path d="m3 7 9 6 9-6" />
        </svg>
      </div>
      <Heading
        :level="1"
        class="!text-2xl"
      >
        {{ $t('register.verify_header') }}
      </Heading>
      <i18n-t
        keypath="register.verify_message"
        tag="p"
        class="mt-2 text-base leading-normal text-zinc-600"
      >
        <template #email>
          <strong class="text-zinc-900">{{ currentEmail }}</strong>
        </template>
      </i18n-t>

      <form
        class="mt-5 flex flex-col gap-4"
        @submit="submitForm"
      >
        <div
          class="grid grid-cols-6 gap-2"
          @paste="onPaste"
        >
          <input
            v-for="(_, index) in digits"
            :key="index"
            :ref="(element) => setInput(element, index)"
            :id="`verify-digit-${index + 1}`"
            :name="`verify-digit-${index + 1}`"
            :aria-label="$t('register.digit', { n: index + 1 })"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="1"
            class="h-[52px] rounded-md border border-zinc-500 text-center text-2xl font-bold text-zinc-900 focus:outline-2 focus:-outline-offset-2 focus:outline-primary"
            :class="verifyError ? 'border-error' : ''"
            :value="digits[index]"
            @input="onInput(index, $event)"
            @keydown="onKeydown(index, $event)"
          >
        </div>
        <p
          v-if="verifyError"
          class="text-sm font-medium text-error"
          role="alert"
        >
          {{ verifyError }}
        </p>
        <Button
          type="submit"
          full-width
          :loading="loading"
          :disabled="loading"
        >
          {{ $t('register.verify_submit') }}
        </Button>
      </form>

      <div class="mt-4 flex items-center justify-between gap-3 text-sm text-zinc-600">
        <span>
          {{ $t('register.resend_prompt') }}
          <button
            type="button"
            class="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:text-zinc-400"
            :disabled="cooldown > 0 || resending"
            @click="resend"
          >
            {{ cooldown > 0 ? $t('register.resend_wait', { seconds: cooldown }) : $t('register.resend') }}
          </button>
        </span>
        <button
          type="button"
          class="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          @click="changingEmail = !changingEmail"
        >
          {{ $t('register.change_email') }}
        </button>
      </div>

      <form
        v-if="changingEmail"
        class="mt-4 flex flex-col gap-3"
        @submit="submitEmailChange"
      >
        <Input
          name="new_email"
          type="email"
          autocomplete="email"
          :label="$t('common.email')"
          v-model="newEmail"
          :error="Boolean(emailError)"
          :error-message="emailError"
          required
        />
        <Button
          type="submit"
          variant="outline"
          full-width
          :loading="changing"
          :disabled="changing"
        >
          {{ $t('register.change_email_submit') }}
        </Button>
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { onBeforeUnmount, onMounted, ref } from 'vue';
  import { AxiosError } from 'axios';
  import { useI18n } from 'vue-i18n';
  import { Button, Heading, Input } from '@libretexts/davis-vue';
  import { useAxios } from '@renderer/useAxios';

  const props = defineProps<{
    email: string;
  }>();

  const emit = defineEmits<{
    (e: 'email-changed', email: string): void;
  }>();

  const { t } = useI18n();
  const axios = useAxios();

  const currentEmail = ref(props.email);
  const digits = ref<string[]>(['', '', '', '', '', '']);
  const inputs = ref<Array<HTMLInputElement | null>>([]);
  const loading = ref(false);
  const verifyError = ref('');
  const cooldown = ref(60);
  const resending = ref(false);
  const changingEmail = ref(false);
  const changing = ref(false);
  const newEmail = ref('');
  const emailError = ref('');
  let cooldownTimer: ReturnType<typeof setInterval> | undefined;

  onMounted(() => startCooldown(60));
  onBeforeUnmount(() => {
    if (cooldownTimer) clearInterval(cooldownTimer);
  });

  function setInput(element: unknown, index: number) {
    inputs.value[index] = element instanceof HTMLInputElement ? element : null;
  }

  function startCooldown(seconds: number) {
    cooldown.value = seconds;
    if (cooldownTimer) clearInterval(cooldownTimer);
    cooldownTimer = setInterval(() => {
      cooldown.value -= 1;
      if (cooldown.value <= 0 && cooldownTimer) {
        clearInterval(cooldownTimer);
      }
    }, 1000);
  }

  function onInput(index: number, event: Event) {
    const value = (event.target as HTMLInputElement).value.replace(/\D/g, '');
    digits.value[index] = value.slice(-1);
    if (value && index < 5) inputs.value[index + 1]?.focus();
  }

  function onKeydown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
      inputs.value[index - 1]?.focus();
    }
  }

  function onPaste(event: ClipboardEvent) {
    const text = event.clipboardData?.getData('text')?.replace(/\D/g, '') ?? '';
    if (text.length < 6) return;
    event.preventDefault();
    digits.value = text.slice(0, 6).split('');
    inputs.value[5]?.focus();
  }

  async function submitForm(event: Event) {
    event.preventDefault();
    verifyError.value = '';
    const code = digits.value.join('');
    if (code.length !== 6) {
      verifyError.value = t('register.verify_incomplete');
      return;
    }
    loading.value = true;
    try {
      await axios.post('/auth/verify-email', {
        email: currentEmail.value,
        code: Number(code),
      });
      const params = new URLSearchParams(window.location.search);
      const source = params.get('source');
      const finish = await axios.post('/auth/complete-registration', {
        ...(source === 'adapt-registration' ? { source } : {}),
      });
      const next = finish.data?.data?.initSessionURL;
      if (next) {
        window.location.assign(next);
        return;
      }
      window.location.assign('/registration-complete');
    } catch (error) {
      loading.value = false;
      verifyError.value = t('register.verify_invalid');
      console.error(error);
    }
  }

  async function resend() {
    if (cooldown.value > 0 || resending.value) return;
    resending.value = true;
    verifyError.value = '';
    try {
      const result = await axios.post('/auth/resend-verification', { email: currentEmail.value });
      startCooldown(Number(result.data?.data?.retry_after) || 60);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 429) {
        const retryAfter = Number(error.response.headers?.['retry-after']);
        startCooldown(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60);
      } else {
        verifyError.value = t('common.unknownerror');
      }
    } finally {
      resending.value = false;
    }
  }

  async function submitEmailChange(event: Event) {
    event.preventDefault();
    emailError.value = '';
    const nextEmail = newEmail.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      emailError.value = t('register.email_invalid');
      return;
    }
    changing.value = true;
    try {
      await axios.post('/auth/registration-email', {
        email: currentEmail.value,
        new_email: nextEmail,
      });
      currentEmail.value = nextEmail;
      emit('email-changed', nextEmail);
      newEmail.value = '';
      changingEmail.value = false;
      digits.value = ['', '', '', '', '', ''];
      startCooldown(60);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 409) {
        emailError.value = t('register.email_taken');
      } else {
        emailError.value = t('common.unknownerror');
      }
    } finally {
      changing.value = false;
    }
  }
</script>
