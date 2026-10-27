<template>
  <RegistrationShell
    :headline="$t('register.almost_done', { name: pageContext.user?.first_name })"
    :supporting="$t('register.brand_step2')"
    :footer="$t('register.signed_up_as', { email: pageContext.user?.email })"
  >
    <ProfileStep
      :show-back="false"
      :submitting="submitting"
      :unknown-error="submitError"
      @submit="finish"
    />
  </RegistrationShell>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { useAxios } from '@renderer/useAxios';
  import { usePageContext } from '@renderer/usePageContext';
  import ProfileStep from '@components/registration/ProfileStep.vue';
  import RegistrationShell from '@components/registration/RegistrationShell.vue';
  import type { RegistrationProfile } from '@components/registration/types';

  const pageContext = usePageContext().value;
  const axios = useAxios();
  const submitting = ref(false);
  const submitError = ref(false);

  async function finish(profile: RegistrationProfile) {
    const uuid = pageContext.user?.uuid;
    if (!uuid) {
      submitError.value = true;
      return;
    }
    submitting.value = true;
    submitError.value = false;
    try {
      await axios.patch(`/users/${uuid}`, {
        user_type: profile.userType,
        lang: profile.lang,
        time_zone: profile.timeZone,
        mktg_email_opt_in: profile.marketingOptIn,
      });
      await axios.post(`/users/${uuid}/organizations`, profile.organizationId
        ? { organization_id: profile.organizationId }
        : { use_default_organization: true });
      const params = new URLSearchParams(window.location.search);
      const source = params.get('source');
      const result = await axios.post('/auth/complete-registration', {
        ...(source === 'adapt-registration' ? { source } : {}),
      });
      const next = result.data?.data?.initSessionURL;
      if (next) {
        window.location.assign(next);
        return;
      }
      window.location.assign('/registration-complete');
    } catch (error) {
      console.error(error);
      submitting.value = false;
      submitError.value = true;
    }
  }
</script>
