<template>
  <form
    class="flex flex-col gap-5"
    novalidate
    @submit="submitForm"
  >
    <div class="flex flex-col gap-1.5">
      <p class="text-sm font-medium text-zinc-600">
        {{ $t('register.step', { current: 2, total: 2 }) }}
      </p>
      <Heading
        :level="1"
        class="!text-3xl"
      >
        {{ $t('register.step2_header') }}
      </Heading>
    </div>

    <RadioGroup
      name="account_type"
      :label="$t('register.role_legend')"
      :model-value="userType"
      :error="Boolean(roleError)"
      :error-message="roleError"
      required
      @update:model-value="userType = $event"
    >
      <Radio
        value="instructor"
        :label="$t('register.instructor')"
        :description="$t('register.instructor_desc')"
      />
      <Radio
        value="student"
        :label="$t('register.student')"
        :description="$t('register.student_desc')"
      />
    </RadioGroup>

    <div class="flex flex-col gap-1.5">
      <Combobox
        v-model="selectedOrg"
        class="relative w-full"
      >
        <ComboboxLabel class="text-base font-medium text-zinc-700">
          {{ $t('register.institution') }}
        </ComboboxLabel>
        <div class="flex w-full items-center gap-2">
          <div
            ref="institutionField"
            class="min-w-0 flex-1"
            @focusout="onInstitutionBlur"
          >
            <ComboboxInputField
              class="w-full"
              :placeholder="$t('register.institution_placeholder')"
              :display-value="orgDisplay"
              :aria-label="$t('register.institution')"
              @change="onQueryChange"
            />
          </div>
          <Button
            v-if="selectedOrg || useDefaultOrganization"
            type="button"
            variant="ghost"
            size="sm"
            :aria-label="$t('register.clear_institution')"
            @click="clearInstitution"
          >
            ×
          </Button>
        </div>
        <ComboboxOptionsList class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-zinc-200 bg-white shadow-md">
          <ComboboxOptionItem
            v-for="org in results"
            :key="org.id"
            :value="org"
            class="cursor-pointer px-3 py-2"
          >
            <span class="block font-medium">{{ org.name }}</span>
            <span
              v-if="org.system?.name"
              class="block text-sm text-zinc-500"
            >{{ org.system.name }}</span>
          </ComboboxOptionItem>
          <ComboboxEmpty
            v-if="showInstitutionEmpty"
            class="px-3 py-2 text-center text-sm text-zinc-500"
          >
            {{ $t('register.institution_empty') }}
          </ComboboxEmpty>
        </ComboboxOptionsList>
      </Combobox>
      <p
        v-if="useDefaultOrganization"
        class="text-sm text-zinc-600"
      >
        {{ $t('register.institution_unlisted') }}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="self-start"
        @click="markUnlisted"
      >
        {{ $t('complete_registration_org.org_not_listed') }}
      </Button>
      <p
        v-if="institutionError"
        class="text-sm font-medium text-error"
        role="alert"
      >
        {{ institutionError }}
      </p>
    </div>

    <div class="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3.5 py-3">
      <span class="flex flex-col gap-0.5">
        <span class="text-sm text-zinc-600">{{ $t('register.detected') }}</span>
        <span class="text-sm font-medium">{{ localeSummary }}</span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        @click="showLocale = !showLocale"
      >
        {{ showLocale ? $t('common.cancel') : $t('register.change') }}
      </Button>
    </div>
    <div
      v-if="showLocale"
      class="flex flex-col gap-3"
    >
      <ThemedSelectInput
        id="registration_language"
        :label="$t('register.language')"
        :options="languageOptions"
        v-model:value="lang"
      />
      <ThemedSelectInput
        id="registration_timezone"
        :label="$t('complete_registration_timezone.timezone')"
        :options="timezoneOptions"
        v-model:value="timeZone"
      />
    </div>

    <Checkbox
      name="marketing_opt_in"
      :label="$t('register.marketing')"
      :description="$t('register.marketing_note')"
      :model-value="marketingOptIn"
      @update:model-value="marketingOptIn = $event"
    />

    <p
      v-if="unknownError"
      class="text-sm font-medium text-error"
      role="alert"
    >
      {{ $t('common.unknownerror') }}
    </p>

    <div class="flex gap-3">
      <Button
        v-if="showBack"
        type="button"
        variant="outline"
        :disabled="submitting"
        @click="emit('back')"
      >
        {{ $t('register.back') }}
      </Button>
      <Button
        type="submit"
        full-width
        class="max-md:min-h-12"
        :loading="submitting"
        :disabled="submitting"
      >
        {{ $t('register.create') }}
      </Button>
    </div>
  </form>
</template>

<script lang="ts" setup>
  import { computed, nextTick, onMounted, ref, watch } from 'vue';
  import { useI18n } from 'vue-i18n';
  import {
    Button,
    Checkbox,
    Combobox,
    ComboboxEmpty,
    ComboboxInputField,
    ComboboxLabel,
    ComboboxOptionItem,
    ComboboxOptionsList,
    Heading,
    Radio,
    RadioGroup,
  } from '@libretexts/davis-vue';
  import ThemedSelectInput from '@components/ThemedSelectInput.vue';
  import { useAxios } from '@renderer/useAxios';
  import { TimezoneOpts } from '@renderer/utils/timezones';
  import { DEFAULT_LANGUAGE } from '@server/helpers';
  import type { RegistrationProfile } from './types';

  type LanguageOption = { tag: string; english_name: string };
  type OrganizationResult = { id: number; name: string; system?: { name?: string } };

  withDefaults(defineProps<{
    submitting?: boolean;
    showBack?: boolean;
    unknownError?: boolean;
  }>(), {
    submitting: false,
    showBack: true,
    unknownError: false,
  });

  const emit = defineEmits<{
    (e: 'back'): void;
    (e: 'submit', profile: RegistrationProfile): void;
  }>();

  const { t } = useI18n();
  const axios = useAxios();

  const userType = ref('');
  const roleError = ref('');
  const institutionError = ref('');
  const selectedOrg = ref<OrganizationResult | null>(null);
  const useDefaultOrganization = ref(false);
  const results = ref<OrganizationResult[]>([]);
  const institutionField = ref<HTMLElement | null>(null);
  const institutionQuery = ref('');
  const institutionSearchPending = ref(false);
  const showInstitutionEmpty = computed(() => (
    institutionQuery.value.trim().length >= 1
    && !institutionSearchPending.value
    && results.value.length === 0
  ));
  const languages = ref<LanguageOption[]>([]);
  const lang = ref(DEFAULT_LANGUAGE);
  const timeZone = ref('America/Los_Angeles');
  const showLocale = ref(false);
  const marketingOptIn = ref(false);

  const languageOptions = computed(() => languages.value.map((language) => ({
    label: language.english_name,
    value: language.tag,
  })));
  const timezoneOptions = computed(() => TimezoneOpts.map((zone) => ({
    label: zone.text,
    value: zone.value,
  })));
  const localeSummary = computed(() => {
    const language = languages.value.find((item) => item.tag === lang.value);
    const zone = TimezoneOpts.find((item) => item.value === timeZone.value);
    const offset = formatOffset(timeZone.value);
    const languageLabel = language?.english_name ?? t('register.language_fallback');
    const zoneLabel = zone?.text ?? timeZone.value;
    return offset ? `${languageLabel} · ${zoneLabel} (${offset})` : `${languageLabel} · ${zoneLabel}`;
  });

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let searchSeq = 0;

  onMounted(async () => {
    timeZone.value = detectTimeZone();
    try {
      const response = await axios.get('/languages');
      languages.value = Array.isArray(response.data?.data) ? response.data.data : [];
      lang.value = detectLanguage(languages.value);
    } catch (error) {
      console.error('Failed to load languages', error);
    }
  });

  watch(selectedOrg, (org) => {
    if (org) {
      useDefaultOrganization.value = false;
      institutionQuery.value = org.name;
    }
  });

  function orgDisplay(value: unknown) {
    const org = value as OrganizationResult | null;
    return org?.name ?? institutionQuery.value;
  }

  async function commitInstitution() {
    if (selectedOrg.value) return;
    const query = institutionQuery.value.trim();
    if (!query) return;
    if (institutionSearchPending.value || results.value.length === 0) {
      if (searchTimer) clearTimeout(searchTimer);
      await searchInstitutions(query);
    }
    if (institutionQuery.value.trim() !== query || selectedOrg.value) return;
    const exact = results.value.find((org) => org.name.toLowerCase() === query.toLowerCase());
    const match = exact ?? (results.value.length === 1 ? results.value[0] : undefined);
    if (!match) return;
    selectedOrg.value = match;
    institutionQuery.value = match.name;
  }

  function onInstitutionBlur(event: FocusEvent) {
    const next = event.relatedTarget as Node | null;
    if (next && (event.currentTarget as Node).contains(next)) return;
    void commitInstitution();
  }

  function onQueryChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.dataset.institutionBlur) {
      input.dataset.institutionBlur = 'true';
      input.addEventListener('blur', () => {
        void commitInstitution();
      });
    }
    const query = input.value;
    institutionQuery.value = query;
    if (searchTimer) clearTimeout(searchTimer);
    if (query.trim().length < 1) {
      searchSeq += 1;
      institutionSearchPending.value = false;
      results.value = [];
      return;
    }
    institutionSearchPending.value = true;
    searchTimer = setTimeout(() => {
      void searchInstitutions(query);
    }, 300);
  }

  async function searchInstitutions(query: string) {
    const seq = ++searchSeq;
    try {
      const response = await axios.get('/organizations', {
        params: { query, limit: 10 },
      });
      if (seq !== searchSeq) return;
      results.value = Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      if (seq !== searchSeq) return;
      console.error('Institution search failed', error);
      results.value = [];
    } finally {
      if (seq === searchSeq) institutionSearchPending.value = false;
    }
  }

  function clearInstitution() {
    selectedOrg.value = null;
    useDefaultOrganization.value = false;
    institutionQuery.value = '';
  }

  function markUnlisted() {
    searchSeq += 1;
    institutionQuery.value = '';
    results.value = [];
    selectedOrg.value = null;
    useDefaultOrganization.value = true;
    institutionError.value = '';
    void nextTick(() => {
      const input = institutionField.value?.querySelector('input');
      if (input) input.value = '';
    });
  }

  function detectLanguage(options: LanguageOption[]) {
    const preferences = typeof navigator !== 'undefined' && navigator.languages?.length
      ? navigator.languages
      : [typeof navigator !== 'undefined' ? navigator.language : DEFAULT_LANGUAGE];
    for (const preference of preferences) {
      if (!preference) continue;
      const exact = options.find((item) => item.tag.toLowerCase() === preference.toLowerCase());
      if (exact) return exact.tag;
      const primary = preference.split('-')[0]?.toLowerCase();
      const loose = options.find((item) => item.tag.toLowerCase() === primary);
      if (loose) return loose.tag;
    }
    return options.find((item) => item.tag === DEFAULT_LANGUAGE)?.tag
      ?? options.find((item) => item.tag.toLowerCase() === 'en')?.tag
      ?? DEFAULT_LANGUAGE;
  }

  function detectTimeZone() {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const known = TimezoneOpts.find((item) => item.value === detected);
      return known?.value ?? 'America/Los_Angeles';
    } catch {
      return 'America/Los_Angeles';
    }
  }

  function formatOffset(zone: string) {
    try {
      const part = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        timeZoneName: 'shortOffset',
      }).formatToParts(new Date()).find((item) => item.type === 'timeZoneName')?.value ?? '';
      return part.replace('GMT', 'UTC').replace('-', '\u2212');
    } catch {
      return '';
    }
  }

  function submitForm(event: Event) {
    event.preventDefault();
    roleError.value = '';
    institutionError.value = '';
    let valid = true;
    if (userType.value !== 'student' && userType.value !== 'instructor') {
      roleError.value = t('register.role_required');
      valid = false;
    }
    if (!selectedOrg.value && !useDefaultOrganization.value) {
      institutionError.value = t('register.institution_required');
      valid = false;
    }
    if (!valid) return;
    emit('submit', {
      userType: userType.value as 'student' | 'instructor',
      lang: lang.value,
      timeZone: timeZone.value,
      marketingOptIn: marketingOptIn.value,
      ...(selectedOrg.value
        ? { organizationId: selectedOrg.value.id }
        : { useDefaultOrganization: true }),
    });
  }
</script>
