<template>
  <div
    aria-live="polite"
    :aria-busy="loading"
  >
    <Heading :level="3" class="text-center">
      {{ $t('register.verify_header') }}
    </Heading>
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
      <Input
        name="code_input"
        :label="$t('register.verify_code')"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        placeholder="123456"
        required
        v-model="code"
        :error="codeErr"
        class="lg:my-6"
      />
      <p
        v-if="verifyErr"
        class="text-error font-medium text-center mt-4 mb-6"
      >
        {{ $t('register.verify_invalid') }}
      </p>
      <Button
        type="submit"
        full-width
        :loading="loading"
        class="mt-2"
      >
        {{ $t('common.continue') }}
      </Button>
    </form>
    <p class="text-xs text-center text-gray-500 mt-4">
      {{ $t('register.verify_thanks') }}
    </p>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { useAxios } from '@renderer/useAxios';
  import { usePageContext } from '@renderer/usePageContext';
  import { Heading, Input, Button } from '@libretexts/davis-vue';
  import createPathWithLocale from '@locales/createPathWithLocale';

  const props = defineProps<{
    email: string;
  }>();
  const axios = useAxios();
  const pageContext = usePageContext().value;

  const code = ref('');
  const codeErr = ref(false);
  const verifyErr = ref(false);
  const loading = ref(false);

  function resetFormErrors() {
    codeErr.value = false;
    verifyErr.value = false;
  }

  function validateForm() {
    let valid = true;
    if (Number.isNaN(Number.parseInt(code.value))) {
      valid = false;
      codeErr.value = true;
    }
    return valid;
  }

  async function submitForm(e: Event) {
    e.preventDefault();
    resetFormErrors();
    if (!validateForm()) return;
    loading.value = true;
    try {
      await axios.post('/auth/verify-email', {
        email: props.email,
        code: code.value,
      });
      loading.value = false;
      const queryParams = new URLSearchParams(window.location.search);
      const queryString = queryParams.toString();
      const newPath = createPathWithLocale('/complete-registration/index', pageContext);
      window.location.assign(`${newPath}` + (queryString ? `?${queryString}` : ''));
    } catch (e) {
      console.error(e);
      loading.value = false;
      verifyErr.value = true;
    }
  }
</script>
