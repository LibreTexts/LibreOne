<template>
  <RegistrationShell
    v-if="stage !== 'verify'"
    :headline="stage === 'account' ? $t('register.brand_headline') : $t('register.almost_done', { name: account.firstName })"
    :supporting="stage === 'account' ? $t('register.brand_supporting') : $t('register.brand_step2')"
    :footer="stage === 'account' ? $t('register.brand_footer') : $t('register.signed_up_as', { email: account.email })"
  >
    <AccountStep
      v-if="stage === 'account'"
      :login-url="props.loginURL || ''"
      :google-register-url="props.googleRegisterURL || ''"
      :microsoft-register-url="props.microsoftRegisterURL || ''"
      :initial-first-name="account.firstName"
      :initial-last-name="account.lastName"
      :initial-email="account.email"
      :email-taken="emailTaken"
      @continue="onContinue"
    />
    <ProfileStep
      v-else
      show-back
      :submitting="creating"
      :unknown-error="createError"
      @back="onBack"
      @submit="onCreate"
    />
  </RegistrationShell>
  <VerifyEmail
    v-else
    :email="account.email"
    @email-changed="account.email = $event"
  />
</template>

<script lang="ts" setup>
  import { onMounted, reactive, ref } from 'vue';
  import { AxiosError } from 'axios';
  import { useAxios } from '@renderer/useAxios';
  import { usePageProps } from '@renderer/usePageProps';
  import AccountStep from '@components/registration/AccountStep.vue';
  import ProfileStep from '@components/registration/ProfileStep.vue';
  import RegistrationShell from '@components/registration/RegistrationShell.vue';
  import VerifyEmail from '@components/registration/VerifyEmail.vue';
  import type { RegistrationAccount, RegistrationProfile } from '@components/registration/types';

  const props = usePageProps<{
    loginURL: string;
    recoveryURL: string;
    googleRegisterURL: string;
    microsoftRegisterURL: string;
    serviceURL?: string;
  }>();

  const axios = useAxios();
  const stage = ref<'account' | 'profile' | 'verify'>('account');
  const creating = ref(false);
  const createError = ref(false);
  const emailTaken = ref(false);
  const account = reactive<RegistrationAccount>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  onMounted(() => {
    if (props.serviceURL) {
      document.cookie = `post_register_service_url=${props.serviceURL}; path=/; SameSite=Strict`;
    }
  });

  function onContinue(next: RegistrationAccount) {
    account.firstName = next.firstName;
    account.lastName = next.lastName;
    account.email = next.email;
    account.password = next.password;
    emailTaken.value = false;
    stage.value = 'profile';
  }

  function onBack() {
    account.password = '';
    stage.value = 'account';
  }

  async function onCreate(profile: RegistrationProfile) {
    creating.value = true;
    createError.value = false;
    try {
      await axios.post('/auth/register', {
        email: account.email,
        password: account.password,
        first_name: account.firstName,
        last_name: account.lastName,
        user_type: profile.userType,
        lang: profile.lang,
        time_zone: profile.timeZone,
        mktg_email_opt_in: profile.marketingOptIn,
        ...(profile.organizationId
          ? { organization_id: profile.organizationId }
          : { use_default_organization: true }),
      });
      account.password = '';
      creating.value = false;
      stage.value = 'verify';
    } catch (error) {
      creating.value = false;
      if (error instanceof AxiosError && error.response?.status === 409) {
        emailTaken.value = true;
        account.password = '';
        stage.value = 'account';
        return;
      }
      createError.value = true;
    }
  }
</script>
