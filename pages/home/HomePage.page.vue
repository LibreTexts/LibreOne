<template>
  <StandardPageLayout fill-height>
    <div aria-live="polite">
      <div>
        <p class="text-3xl font-medium">
          {{ $t("home.yourlibreverse") }}
        </p>
        <p class="mt-2 text-slate-500">
          {{ $t("home.yourlibreversetagline") }}
        </p>
        <div
          class="apps-list px-2"
          v-if="apps.length > 0"
        >
          <div
            class="app-item-container"
            v-for="app in apps.filter((app) => app.app_type === 'standalone')"
            @click="openAppLink(app.main_url)"
            :key="app.id ?? app.name"
          >
            <div class="app-item-icon-container">
              <img
                :src="app.icon"
                :alt="app.name"
                width="90"
                height="90"
              >
            </div>
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
      <div class="mt-2">
        <p class="text-3xl font-medium">
          {{ $t("home.notsupported") }}
        </p>
        <p class="mt-2 text-slate-500">
          {{ $t("home.notsupportedtagline") }}
        </p>
        <div
          class="apps-list px-2"
          v-if="unsupported.length > 0"
        >
          <div
            class="app-item-container"
            v-for="unapp in unsupported"
            @click="openAppLink(unapp.main_url)"
            :key="unapp.id ?? unapp.name"
          >
            <div class="app-item-icon-container">
              <img
                :src="unapp.icon"
                :alt="unapp.name"
                width="90"
                height="90"
              >
            </div>
            <div class="app-item-text-container">
              <p class="app-item-header">
                {{ unapp.name }}
              </p>
              <p class="app-item-descrip">
                {{ unapp.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
      <div>
        <div class="mt-2">
          <p class="text-3xl font-medium">
            {{ $t("home.libraries") }}
          </p>
          <i18n-t
            keypath="home.libraryeditrequest"
            tag="p"
            class="mt-2 text-slate-500"
          >
            <template #requestaccesslink>
              <!-- New Instructor Verification Req URL-->
              <a
                href="https://commons.libretexts.org/verification/instructor"
                target="_blank"
                rel="noreferer"
                class="text-accent"
              >
                {{ $t("home.requestaccess") }}.
              </a>
              {{ $t("home.libraryeditinfo") }}
            </template>
          </i18n-t>
          <div
            class="apps-list px-2"
            v-if="allLibs.length > 0"
          >
            <div
              class="app-item-container"
              v-for="lib in allLibs"
              @click="openAppLink(lib.main_url)"
              :key="lib.id ?? lib.name"
            >
              <div class="app-item-icon-container">
                <img
                  :src="lib.icon"
                  :alt="lib.name"
                  width="90"
                  height="90"
                >
                <div
                  class="app-item-key-overlay"
                  v-if="hasEditAccess(lib.id)"
                >
                  <FontAwesomeIcon
                    class="app-item-key-icon"
                    icon="fa-solid fa-key"
                  />
                </div>
              </div>
              <div class="app-item-text-container">
                <p class="app-item-header">
                  {{ lib.name }}
                </p>
                <p class="app-item-descrip">
                  {{ lib.description }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </StandardPageLayout>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import StandardPageLayout from '../../components/layout/StandardPageLayout.vue';
  import { Application } from '@server/types/applications';
  import { usePageContext } from '@renderer/usePageContext';
  import { getUserAppsAndLibraries } from '@renderer/utils/apps';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { useAxios } from '@renderer/useAxios';

  const axios = useAxios();
  const pageContext = usePageContext();

  const loading = ref(false);
  const apps = ref<Application[]>([]);
  const libs = ref<Application[]>([]);
  const allLibs = ref<Application[]>([]);
  const unsupported = ref<Application[]>([]);

  loadApps();
  async function loadApps() {
    try {
      loading.value = true;
      if (!pageContext?.user?.uuid) {
        throw new Error('nouuid');
      }

      [apps.value, libs.value, allLibs.value] = await getUserAppsAndLibraries(
        pageContext.user.uuid,
      );

      const unsupportedRes = await axios.get('/applications');

      // No-op if no data
      if (unsupportedRes.data && unsupportedRes.data.data && Array.isArray(unsupportedRes.data.data)) {
        unsupported.value = unsupportedRes.data.data.filter(
          (app: Application) => app.supports_cas === false && app.app_type === 'standalone',
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      loading.value = false;
    }
  }

  function openAppLink(href: string) {
    window.open(href, '_blank');
  }

  // User has edit access to a library if they
  function hasEditAccess(id: string | number): boolean {
    if ([...libs.value.map((app) => app.id.toString())].includes(id.toString())) {
      return true;
    }
    return false;
  }
</script>
<style lang="css" scoped>
.apps-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, 12rem);
  justify-content: space-between;
  grid-gap: 1rem;
  padding-top: 1rem;
}
.app-item-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-items: center;
  text-align: center;
  width: 12rem;
  height: 12rem;
  padding: 0.5rem 0.2rem;
  margin-right: 1.5rem;
  margin-bottom: 1.25rem;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 6px -2px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}
.app-item-container:hover {
  box-shadow: 0 6px 10px 0px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}
.app-item-icon-container {
  position: relative;
  display: flex;
  width: 95%;
  height: 60%;
  border-radius: 5px;
  background-color: #e5e7eb;
  align-items: center;
  justify-content: center;
}
.app-item-key-overlay {
  position: absolute;
  top: 0;
  right: 0;
  width: 2rem;
  height: 2rem;
  background-color: #f8fafc;
  border-top-right-radius: 5px;
  border-bottom-left-radius: 5px;
  padding-top: 2px;
}
.app-item-key-icon {
  color: #6b7280;
  font-size: 0.9rem;
}
.app-item-text-container {
  display: flex;
  flex-direction: column;
  text-align: center;
  margin-top: 0.25rem;
}
.app-item-header {
  font-size: 0.9rem;
  font-weight: 500;
}
.app-item-descrip {
  font-size: 0.7rem;
  color: #6b7280;
}

@media only screen and (max-width: 480px) {
  .apps-list {
    grid-template-columns: none;
    grid-template-rows: repeat(auto-fill, 12rem);
    justify-content: center;
  }

  .app-item-container {
    margin: 0;
    width: 14rem;
  }
}
</style>
