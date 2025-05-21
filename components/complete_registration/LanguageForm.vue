<template>
  <h1 class="text-center text-3xl font-medium">
    {{ t('complete_registration_lang.header', { name: firstName }) }}
  </h1>
  <p class="text-center mt-4">
    {{ t('complete_registration_lang.tagline') }}
  </p>
  <p class="text-center mt-1 mb-4 text-sm text-gray-500">
    {{ t('complete_registration_lang.tagline_note') }}
  </p>
  <template v-if="!loading">
    <div class="lg:my-4">
      <div>
        <ThemedSelectInput
          id="language_select_input"
          :placeholder="t('common.select')"
          :options="languages.map((lang) => ({
            label: lang.english_name,
            value: lang.tag
          }))"
          v-model:value="selectedLanguageTag"
          class="my-4"
          :msprops="{openDirection: 'top', searchable: true, closeOnSelect: true}"
        />
      </div>
    </div>
    <ThemedButton
      type="submit"
      @click="submitForm"
      class="mt-6"
      :loading="updating"
    >
      {{ t('common.continue') }}
    </ThemedButton>
  </template>
  <div
    v-else
    class="flex items-center justify-center p-8"
  >
    <LoadingIndicator class="!h-8 !w-8" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAxios } from '@renderer/useAxios';
import LoadingIndicator from '@components/LoadingIndicator.vue';
import ThemedSelectInput from '../ThemedSelectInput.vue';
import ThemedButton from '../ThemedButton.vue';
import { DEFAULT_LANGUAGE } from '@server/helpers';

type Language = {
  id: number;
  tag: string;
  english_name: string;
}

const emit = defineEmits(['language-update']);
const props = defineProps<{
  firstName: string;
  uuid: string;
}>();

const { t } = useI18n();
const axios = useAxios();
const loading = ref(true);
const updating = ref(false);
const languages = ref<Language[]>([]);
const selectedLanguageTag = ref(DEFAULT_LANGUAGE);

onMounted(async () => {
  try {
    const response = await axios.get('/languages');
    languages.value = response.data.data;
  } catch (error) {
    console.error('Failed to fetch languages:', error);
  } finally {
    loading.value = false;
  }
});

async function submitForm() {
  if (!selectedLanguageTag.value) return;

  updating.value = true;
  try {
    await axios.patch(`/users/${props.uuid}`, {
      lang: selectedLanguageTag.value
    });
    emit('language-update');
  } catch (error) {
    console.error('Failed to update language:', error);
  } finally {
    updating.value = false;
  }
}
</script>

<style scoped>
</style>
