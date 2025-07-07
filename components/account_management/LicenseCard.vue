<template>
    <div class="bg-white rounded-md shadow-md p-2 flex flex-col w-48 h-48 border border-slate-200">
      <div class="flex justify-center mb-4 h-40 bg-gray-200/70 overflow-hidden rounded-md">
        <img 
          :src="props.license.application_license.picture_url" 
          :alt="props.license.application_license.name"
          class="w-full h-full object-cover"
        />
      </div>
  
      <h3 class="text-center font-medium text-sm mb-2">
        {{ props.license.application_license.name }}
      </h3>
  
      <p class="text-center text-xs text-slate-600 mb-4">
        {{ $t('license-card.expiry-date') }} {{ formatDate(props.license.expires_at) }}
      </p>
  
      <!-- <ThemedButton
        @click="$emit('manage', props.license.application_license_id)"
        variant="outlined"
        class="w-full mt-auto"
      >
        <span class="text-primary truncate block px-2">{{ $t('license-card.manage-cancel') }}</span>
      </ThemedButton> -->
    </div>
  </template>
  
  <script lang="ts" setup>
  import ThemedButton from '../ThemedButton.vue';
  import { useI18n } from 'vue-i18n';

  const { t } = useI18n();
  
  interface License {
    application_license_id: string;
    granted_by: string;
    expires_at: string;
    original_purchase_date: string;
    revoked: boolean
    revoked_at: string;
    application_license: {
      uuid: string;
      name: string;
      duration_days: number;
      perpetual: boolean;
      picture_url: string;
    };
  }
  
  const props = defineProps<{
    license: License;
  }>();
  
  defineEmits<{
    (e: 'manage', id: string): void;
  }>();
  
  function formatDate(date: string) {
    if (!date) return t('license-card.perpetual');
    return new Date(date).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  }
  </script>