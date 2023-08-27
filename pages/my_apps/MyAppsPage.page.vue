<template>
  <StandardPageLayout fill-height>
    <div
      id="my-apps-container"
      aria-live="polite"
    >
      <p class="text-3xl font-medium mb-2">
        {{ $t("my_apps.managemyapps") }}
      </p>
      <div v-if="pageContext.user?.verify_status === 'verified'">
        <!--CURRENT APPS-->
        <div class="mt-6">
          <!-- HEADER -->
          <p class="text-xl font-medium">
            {{ $t("my_apps.yourapps") }}
          </p>
          <p class="text-gray-400">
            {{ $t("my_apps.yourappstagline") }}
          </p>
          <!-- CONTENT -->
          <div
            class="apps-list border border-gray-200 rounded-md mt-2"
            v-if="currentApps.length > 0"
          >
            <div
              class="app-item-container"
              v-for="app in currentApps"
              :key="app.id ?? app.name"
            >
              <div class="app-item-text-container">
                <p class="app-item-header">
                  {{ app.name }}
                </p>
                <p class="app-item-descrip">
                  {{ app.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!--AVAILABLE APPS-->
        <div class="mt-6">
          <!-- HEADER -->
          <div class="flex flex-row justify-between items-center">
            <div class="flex flex-col">
              <p class="text-xl font-medium">
                {{ $t("my_apps.availableapps") }}
              </p>
              <p class="text-gray-400">
                {{ $t("my_apps.availableappstagline") }}
              </p>
            </div>
            <div class="flex flex-col items-center justify-center">
              <div
                class="d-flex px-2 py-1 items-center justify-center"
                v-if="!hasActiveRequest"
              >
                <p class="text-sm text-sky-700 font-medium">
                  <FontAwesomeIcon
                    icon="fa-solid fa-cart-shopping"
                    color="#0369a1"
                    class="mr-1"
                  />
                  {{ requestedApps.length }} {{ $t("my_apps.itemcount") }}
                </p>
              </div>
            </div>
          </div>
          <!-- CONTENT -->
          <div
            class="mt-2"
            v-if="!hasActiveRequest"
          >
            <div
              class="apps-list border border-gray-200 rounded-md"
              v-if="availableApps.length > 0"
            >
              <div
                class="app-item-container app-item-hover"
                v-for="avail in availableApps"
                :key="avail.id ?? avail.name"
              >
                <div class="app-item-text-container">
                  <p class="app-item-header">
                    {{ avail.name }}
                  </p>
                  <p class="app-item-descrip">
                    {{ avail.description }}
                  </p>
                </div>
                <button
                  @click="
                    itemInCart(avail.id.toString())
                      ? removeAppFromCart(avail.id.toString())
                      : addAppToCart(avail.id.toString())
                  "
                  :class="`d-flex ${
                    itemInCart(avail.id.toString())
                      ? 'bg-slate-500'
                      : 'bg-sky-700'
                  } rounded px-2 py-1 items-center justify-center`"
                >
                  <p class="text-xs text-white font-medium">
                    {{
                      itemInCart(avail.id.toString())
                        ? $t("my_apps.remove")
                        : $t("my_apps.add")
                    }}
                    <FontAwesomeIcon
                      icon="fa-solid fa-cart-shopping"
                      color="white"
                      class="ml-1"
                    />
                  </p>
                </button>
              </div>
            </div>
            <ThemedButton
              class="mt-2"
              :loading="loading"
              :disabled="requestedApps.length === 0"
              @click="submitRequest"
            >
              {{ $t("my_apps.submit") }}
            </ThemedButton>
          </div>
          <div
            class="flex justify-center mt-6"
            v-else
          >
            <div
              class="flex flex-col p-4 rounded max-w-lg border border-gray-500 text-black shadow"
            >
              <p class="text-center text-lg font-medium">
                {{ $t("my_apps.activerequest") }}
              </p>
              <p class="text-center text-md">
                {{ $t("my_apps.activerequesttagline") }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div
        class="flex justify-center mt-6"
        v-else
      >
        <div
          class="flex flex-col p-4 rounded max-w-lg border border-gray-500 text-black shadow"
        >
          <p class="text-center text-lg font-medium">
            {{ $t("my_apps.notinstructor") }}
          </p>
          <i18n-t
            class="text-center text-md"
            keypath="my_apps.notinstructortagline"
            tag="span"
          >
            <template #link>
              <a
                href="/instructor"
                class="underline"
              >{{ $t("common.here") }}</a>
            </template>
          </i18n-t>
        </div>
      </div>
    </div>
  </StandardPageLayout>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import StandardPageLayout from '../../components/layout/StandardPageLayout.vue';
  import ThemedButton from '../../components/ThemedButton.vue';
  import { Application } from '@server/types/applications';
  import { usePageContext } from '@renderer/usePageContext';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { useAxios } from '@renderer/useAxios';

  // Props & Hooks
  const axios = useAxios();
  const pageContext = usePageContext();

  // Data & UI
  const hasActiveRequest = ref(false);
  const loading = ref(false);
  const currentApps = ref<Application[]>([]);
  const availableApps = ref<Application[]>([]);
  const requestedApps = ref<string[]>([]);

  // Init
  checkActiveRequest();
  loadApps();

  // Methods
  async function checkActiveRequest() {
    try {
      loading.value = true;
      if (!pageContext?.user?.uuid) {
        throw new Error('nouuid');
      }

      hasActiveRequest.value = true;
    } catch (err) {
      console.error(err);
    } finally {
      loading.value = false;
    }
  }
  async function loadApps() {
    try {
      loading.value = true;
      if (!pageContext?.user?.uuid) {
        throw new Error('nouuid');
      }

      const allAppsPromise = axios.get('/applications');
      const userAppsPromise = axios.get(
        `/users/${pageContext.user.uuid}/applications`,
      );

      const res = await Promise.all([allAppsPromise, userAppsPromise]);
      if (!res[0] || !res[1]) {
        throw new Error('nores');
      }

      if (
        !Array.isArray(res[0].data.data) ||
        !Array.isArray(res[1].data.data.applications)
      ) {
        throw new Error('badres');
      }

      // Pay attention to the order here! Current apps needs to be set first
      currentApps.value = res[1].data.data.applications as Application[];
      availableApps.value = (res[0].data.data as Application[]).filter((app) => {
        return !currentApps.value.map((app) => app.name).includes(app.name);
      });
    } catch (err) {
      console.error(err);
    } finally {
      loading.value = false;
    }
  }

  function addAppToCart(id: string) {
    requestedApps.value.push(id);
  }

  function removeAppFromCart(id: string) {
    requestedApps.value = requestedApps.value.filter((appId) => appId !== id);
  }

  function itemInCart(id: string) {
    return requestedApps.value.includes(id);
  }

  async function submitRequest() {
    try {
      loading.value = true;

      if (!pageContext?.user?.uuid) {
        throw new Error('nouuid');
      }

    //TODO: Add a request to the backend to add the apps to the user's account
    } catch (err) {
      console.error(err);
    } finally {
      loading.value = false;
    }
  }
</script>
<style lang="css" scoped>
.apps-list {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: flex-start;
}
.app-item-container {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.5rem;
  border-radius: 5px;
}
.app-item-hover:hover {
  background-color: #f3f4f6;
  cursor: pointer;
}
.app-item-text-container {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  text-align: left;
}
.app-item-header {
  font-size: 0.9rem;
  font-weight: 500;
}
.app-item-descrip {
  font-size: 0.7rem;
  color: #6b7280;
}
</style>
