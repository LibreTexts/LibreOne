<template>
  <h1 class="text-center text-3xl font-medium">
    {{ $t('complete_registration_org.header') }}
  </h1>
  <p class="text-center mt-4">
    {{ $t('complete_registration_org.tagline') }}
  </p>
  <p class="text-center mt-1 text-sm text-gray-500">
    {{ $t('complete_registration_org.tagline_note') }}
  </p>
  <template v-if="!loading">
    <div class="lg:my-4">
      <label
        for="search_input"
        class="block text-sm font-medium"
      >
        {{ $t('complete_registration_org.search_label') }}
      </label>
      <input
        id="search_input"
        type="text"
        v-model="query"
        placeholder="Start typing to search"
        class="border block h-10 mt-2 w-full rounded-md px-2 placeholder:text-slate-400 placeholder:font-light"
      >
      <span class="ml-1 mt-2 text-xs text-center text-gray-500">{{ $t('complete_registration_org.results_live') }}</span>
      <div
        v-if="firstQuery"
        class="mt-8"
      >
        <h2 class="pb-2 font-medium text-lg border-b-2 border-b-slate-300">
          {{ $t('complete_registration_org.results') }}
          <span class="sr-only">({{ $t('complete_registration_org.results_found', { num: numResults.toLocaleString() }) }})</span>
        </h2>  
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
              <button
                class="flex items-center justify-center h-8 bg-secondary p-2 mr-2 rounded-md text-white w-16 text-sm font-medium hover:bg-violet-700 hover:shadow"
                @click="submitOrganization({ organization_id: result.id })"
              >
                {{ $t('complete_registration_org.select') }}
              </button>
            </div>
          </li>
          <li class="h-12 flex border-b border-b-slate-200 px-2 py-4">
            <div class="flex flex-1 items-center">
              <i18n-t
                keypath="complete_registration_org.add_institution"
                tag="span"
              >
                <template #query>
                  <strong>{{ query }}</strong>
                </template>
              </i18n-t>
            </div>
            <div class="flex items-center">
              <button
                class="flex items-center justify-center h-8 bg-secondary p-2 mr-2 rounded-md text-white w-16 text-sm font-medium hover:bg-violet-700 hover:shadow"
                @click="submitOrganization({ add_organization_name: query })"
              >
                {{ $t('complete_registration_org.add') }}
              </button>
            </div>
          </li>
        </ul>
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

  type OrganizationResult = {
    id: number;
    name: string;
  };
  type OrganizationPatch = {
    organization_id?: number;
    add_organization_name?: string;
  };

  const props = defineProps<{
    uuid: string;
  }>();
  const axios = useAxios();

  const loading = ref(false);
  const query = ref('');
  const firstQuery = ref(false);

  const results: Ref<OrganizationResult[]> = ref([]);
  const numResults = computed(() => results.value.length);

  /**
   * Watches changes to the search query and retrieves updated results from the server.
   */
  watch(query, async (newQuery) => {
    if (newQuery.length > 1) {
      if (!firstQuery.value) {
        firstQuery.value = true;
      }
      const queryResult = await axios.get(`/organizations`, {
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
   * Submits the Organization selection to the server, then redirects to the
   * Registration Completed page.
   *
   * @param data - Organization information to submit.
   */
  async function submitOrganization(data: OrganizationPatch) {
    loading.value = true;
    try {
      await axios.patch(`/users/${props.uuid}`, data);
      window.location.assign('/registration-complete');
    } catch (e) {
      loading.value = false;
    }
  }

</script>