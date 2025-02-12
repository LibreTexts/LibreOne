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
        <div v-if="!sent">
          <a
            class="text-accent font-medium text-sm block text-center lg:text-left"
            :href="props.sourceURL"
          >
            <FontAwesomeIcon icon="fa-solid fa-circle-arrow-left" />
            <span class="ml-2">{{ sourceText }}</span>
          </a>
          <h1 class="text-3xl text-center font-medium mt-4 lt:mt-2">
            {{ $t('register.forgotpassword') }}
          </h1>
          <p class="text-center mt-4">
            {{ $t('passwordrecovery.forgottagline') }}
          </p>
          <form @submit="submitForm">
            <div class="my-6">
              <label
                for="email_input"
                class="block text-sm font-medium"
              >
                {{ $t('common.email') }}
              </label>
              <input
                id="email_input"
                type="email"
                aria-required="true"
                v-model="email"
                :placeholder="$t('common.email_placeholder')"
                :class="['border', emailErr ? 'border-red-600' : 'border-gray-300', 'block', 'h-10', 'mt-2', 'w-full', 'rounded-md', 'px-2', 'placeholder:text-slate-400', 'placeholder:font-light']"
              >
            </div>
            <button
              type="submit"
              class="inline-flex items-center justify-center h-10 bg-primary p-2 mb-2 rounded-md text-white w-full font-medium hover:bg-sky-700 hover:shadow"
            >
              <span v-if="!loading">{{ $t('passwordrecovery.sendlink') }}</span>
              <template v-else>
                <LoadingIndicator />
                <span class="ml-2">{{ $t('passwordrecovery.sending') }}</span>
              </template>
            </button>
          </form>
        </div>
        <div v-else>
          <a
            class="text-accent font-medium text-sm block text-center lg:text-left"
            :href="props.sourceURL"
          >
            <FontAwesomeIcon icon="fa-solid fa-circle-arrow-left" />
            <span class="ml-2">{{ sourceText }}</span>
          </a>
          <h1 class="text-3xl text-center font-medium mt-4 lg:mt-2">
            {{ $t('passwordrecovery.checkemail') }}
          </h1>
          <i18n-t
            keypath="passwordrecovery.sentmessage"
            tag="p"
            class="text-center mt-6 mb-4"
          >
            <template #email>
              <strong>{{ email }}</strong>
            </template>
          </i18n-t>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, ref } from 'vue';
  import { useI18n } from 'vue-i18n';
  import { useAxios } from '@renderer/useAxios';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import LoadingIndicator from '@components/LoadingIndicator.vue';
  import { usePageProps } from '@renderer/usePageProps';
  
  const props = usePageProps<{
    source: string;
    sourceURL: string;
    redirectURI?: string;
  }>()

  const axios = useAxios();
  const { t } = useI18n();

  const loading = ref(false);
  const sent = ref(false);
  const email = ref('');
  const emailErr = ref(false);
  const sourceText = computed(() => {
    let source = t('common.signin').toLocaleLowerCase();
    if (props.source === 'register') {
      source = t('register.register').toLocaleLowerCase();
    }
    return t('passwordrecovery.backtosource', { source });
  });

  /**
   * Resets any active error states in the form.
   */
  function resetFormErrors() {
    emailErr.value = false;
  }

  /**
   * Validates all form fields and sets any error states, if necessary.
   */
  function validateForm() {
    let valid = true;
    if (email.value.trim().length < 3 || email.value.trim().length > 320 || !email.value.includes('@')) {
      valid = false;
      emailErr.value = true;
    }
    return valid;
  }

  /**
   * Submits the password reset request to the server.
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
      await axios.post('/auth/passwordrecovery', {
        email: email.value,
        ...(props.redirectURI && {
          redirectURI: props.redirectURI,
        }),
      });
      loading.value = false;
      sent.value = true;
    } catch (e) {
      loading.value = false;
      alert(t('common.unknownerror'));
    }
  }

</script>