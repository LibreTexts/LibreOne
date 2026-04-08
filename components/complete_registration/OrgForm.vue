<template>
  <Heading :level="3" class="text-center">
    {{ $t('complete_registration_org.header') }}
  </Heading>
  <p class="text-center mt-4">
    {{ $t('complete_registration_org.tagline') }}
  </p>
  <p class="text-center mt-1 mb-4 text-sm text-gray-500">
    {{ $t('complete_registration_org.tagline_note') }}
  </p>
  <template v-if="!loading">
    <div class="lg:my-4">
      <Input
        name="search_input"
        :label="$t('complete_registration_org.search_label')"
        v-model="query"
        placeholder="Start typing to search"
        class="mt-2"
      />
      <span class="ml-1 mt-2 text-xs text-center text-gray-500">{{ $t('complete_registration_org.results_live') }}</span>
      <div
        v-if="firstQuery"
        class="mt-8"
      >
        <Heading :level="3" class="pb-2 border-b-2 border-b-slate-300">
          {{ $t('complete_registration_org.results') }}
          <span class="sr-only">({{ $t('complete_registration_org.results_found', { num: numResults.toLocaleString() }) }})</span>
        </Heading>
        <ul>
          <li
            v-for="result in results"
            :key="result.id"
            class="flex border-b border-b-slate-200 p-2"
          >
            <div class="flex flex-1 items-center mr-20">
              <span>{{ result.name }}</span>
            </div>
            <div class="flex items-center">
              <Button
                size="sm"
                @click="submitOrganization({ organization_id: result.id })"
                class="mr-2"
              >
                {{ $t('complete_registration_org.select') }}
              </Button>
            </div>
          </li>
        </ul>
        <div class="flex justify-center mt-6">
          <Button
            variant="ghost"
            size="sm"
            @click="submitOrganization({ use_default_organization: true })"
          >
            {{ $t('complete_registration_org.org_not_listed') }}
          </Button>
        </div>
      </div>
    </div>
  </template>
  <div
    v-else
    class="flex items-center justify-center p-8"
  >
    <LoadingIndicator class="!h-8 !w-8" />
  </div>

</template>

<script lang="ts" setup>
  import { computed, ref, Ref, watch } from 'vue';
  import { useAxios } from '@renderer/useAxios';
  import LoadingIndicator from '@components/LoadingIndicator.vue';
  import { Heading, Input, Button } from '@libretexts/davis-vue';

  // Local Types
  type OrganizationResult = {
    id: number;
    name: string;
  };
  type OrganizationPatch = {
    organization_id?: number;
    use_default_organization?: boolean;
  };
  
  // Props and Hooks
  const emit = defineEmits<{
    (e: 'org-update'): void;
  }>();
  const props = defineProps<{
    uuid: string;
  }>();
  const axios = useAxios();

  // UI & Data
  const loading = ref(false);
  const query = ref('');
  const firstQuery = ref(false);

  const results: Ref<OrganizationResult[]> = ref([]);
  const numResults = computed(() => results.value.length);

  // Methods

  /**
   * Watches changes to the search query and retrieves updated results from the server.
   */
  watch(query, async (newQuery) => {
    if (newQuery.length > 1) {
      if (!firstQuery.value) {
        firstQuery.value = true;
      }
      const queryResult = await axios.get('/organizations', {
        params: {
          query: newQuery,
          limit: 10,
        },
      });
      if (Array.isArray(queryResult.data?.data)) {
        results.value = queryResult.data.data;
      }
    }
  });

  /**
   * Submits the Organization selection to the server, then redirects to the SSO
   * session initiation URL.
   *
   * @param data - Organization information to submit.
   */
  async function submitOrganization(data: OrganizationPatch) {
    try {
      loading.value = true;
      await axios.post(`/users/${props.uuid}/organizations`, data);
      emit('org-update');
    } catch (e) {
      loading.value = false;
    } finally {
      loading.value = false;
    }
  }

</script>