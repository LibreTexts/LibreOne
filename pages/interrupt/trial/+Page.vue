<template>
  <div class="bg-white flex flex-col items-center justify-center h-full">
    <div class="p-4 lg:p-0 mx-auto max-w-7xl !-mt-28">
      <div class="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
        <div class="lg:pr-12 lg:pt-4 flex flex-col items-center lg:items-start">
          <div class="lg:max-w-lg flex flex-col items-center lg:items-start">
            <a href="https://libretexts.org" class="flex justify-center lg:justify-start">
              <img src="@renderer/libretexts_logo.png" class="h-14 lg:h-28 mb-4">
            </a>
            <p
              class="text-center lg:text-left mt-2 text-pretty text-3xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
              {{ header }}
            </p>
            <p class="text-center lg:text-left mt-6 text-lg/8  text-gray-900">
              {{ description }}
            </p>
          </div>
          <LoadingIndicator v-if="loading" class="mt-6" />
          <div class="mt-6 flex flex-col items-center lg:items-start justify-center gap-x-6"
            v-else-if="!loading && !didStartTrial && props.expired_type">
            <a :href="`${commonsStoreUrl}/product/${props.application?.stripe_id}?mtm_source=libreone`"
              class="w-full lg:w-fit">
              <ThemedButton variant="default" class="w-56" icon="IconShoppingCart">
                {{ $t(props.expired_type === 'trial' ? 'subscriptions.trial-expired-action' :
                  'subscriptions.access-expired-action') }}
              </ThemedButton>
            </a>
            <div class="flex flex-row items-center justify-start gap-x-2 mt-4 text-slate-500 text-sm/6">
              <a href="/redeem" class="font-semibold text-center pt-1 lg:text-left hover:underline">
                {{ $t('subscriptions.have-code') }}
              </a>
            </div>
          </div>
          <div class="mt-6 flex flex-col items-start justify-center gap-x-6"
            v-else-if="!loading && !didStartTrial && !props.expired_type">
            <ThemedButton variant="default" class="w-56" icon="IconPlayerPlayFilled" @click="startTrial">
              {{ $t('subscriptions.start-trial-action') }}
            </ThemedButton>
            <div class="flex flex-row items-center justify-start gap-x-2 mt-4 text-slate-500 text-sm/6">
              <a href="/redeem" class="font-semibold text-center pt-1 lg:text-left hover:underline">
                {{ $t('subscriptions.have-code') }}
              </a>
            </div>
          </div>
          <div class="mt-6 flex flex-col items-start justify-center gap-x-6" v-else-if="!loading && didStartTrial">
            <div class="flex items-center gap-x-2">
              <IconCircleCheck class="w-6 h-6 text-green-500" />
              <p class="text-sm/6 font-semibold text-slate-600 text-center w-full lg:text-left">
                {{ $t('subscriptions.start-trial-success') }}
              </p>
            </div>
            <a :href="props.service_url || ''">
              <ThemedButton variant="default" class="!w-fit mt-6 px-3" icon="IconArrowRight">
                {{ $t('subscriptions.start-trial-continue', { application: props.application?.name || 'Application' })
                }}
              </ThemedButton>
            </a>
          </div>
          <p v-if="!loading && trialStartError" class="text-red-500 mt-4 text-sm">
            {{ trialStartError }}
          </p>
        </div>
        <img :src="props.application?.preview_image || ''" alt="Product screenshot"
          class="hidden lg:block max-w-none rounded-xl shadow-xl ring-1 ring-white/10 sm:w-[57rem] md:-ml-4 lg:-ml-0 border border-slate-200 pt-4"
          width="2432" height="1442" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePageProps } from '@renderer/usePageProps';
import { Application } from '@server/types/applications';
import ThemedButton from '../../../components/ThemedButton.vue';
import { useI18n } from 'vue-i18n';
import { usePageContext } from '@renderer/usePageContext';
import { ref, computed } from 'vue';
import { useAxios } from '@renderer/useAxios';
import LoadingIndicator from '../../../components/LoadingIndicator.vue';
import { IconCircleCheck } from '@tabler/icons-vue';

const axios = useAxios();
const props = usePageProps<{ expired_type?: string; application?: Application | null, service_url?: string | null }>();
const { t } = useI18n();
const pageContext = usePageContext();

const loading = ref(false);
const didStartTrial = ref(false);
const trialStartError = ref<string | null>(null);

const commonsStoreUrl = import.meta.env.VITE_COMMONS_STORE_URL || 'https://commons.libretexts.org/store';

const header = computed
  (() => {
    const key = props.expired_type
      ? props.expired_type === 'trial'
        ? 'subscriptions.trial-expired-header'
        : 'subscriptions.access-expired-header'
      : 'subscriptions.start-trial-header';
    return t(key, { application: props.application?.name || 'Application' });
  });

const description = computed(() => {
  const key = props.expired_type
    ? props.expired_type === 'trial'
      ? 'subscriptions.trial-expired-desc'
      : 'subscriptions.access-expired-desc'
    : 'subscriptions.start-trial-desc';
  return t(key, { application: props.application?.name || 'Application' });
});

async function startTrial() {
  try {
    loading.value = true;
    trialStartError.value = null;

    const user_id = pageContext.value.user?.uuid;
    const app_id = props.application?.id;
    if (!user_id || !app_id) {
      console.error('User ID or Application ID is missing');
      return;
    }

    const response = await axios.post(`/app-licenses/trial/create/${user_id}/${app_id}`).catch((error) => {
      return error.response || { data: { success: false, message: error.message } };
    });

    if (response.data.success) {
      didStartTrial.value = true;
    } else {
      console.error('Failed to start trial:', response.data.message);
      trialStartError.value = response.data.message || t('subscriptions.start-trial-error');
    }
  } catch (error) {
    console.error('Error starting trial:', error);
  } finally {
    loading.value = false;
  }
}

</script>