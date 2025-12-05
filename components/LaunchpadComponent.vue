<template>
  <div
    aria-live="polite"
    v-bind="$attrs"
  >
    <div>
      <div class="flex flex-col gap-y-3">
      <AnnouncementBanner
        v-for="announcement in $props.announcements || []"
        :key="announcement.uuid"
        :announcement="announcement"
        :rounded="true"
      />
      <NotVerifiedBanner
        v-if="$props.authorized && pageContext?.user?.user_type === 'instructor' && pageContext?.user?.verify_status === 'not_attempted'"
      />
      </div>
      <p class="text-3xl font-medium">
        {{
          $t(
            $props.authorized
              ? "launchpad_auth.yourlibreverse"
              : "launchpad_unauth.appsandservices"
          )
        }}
      </p>
      <p
        class="mt-2 text-slate-500"
        v-if="$props.authorized || hasUnsupportedApps"
      >
        <span v-if="$props.authorized">{{ $t("launchpad_auth.yourlibreversetagline") }}</span>
        <span v-if="$props.authorized && hasUnsupportedApps">&nbsp;</span>
        <span v-if="hasUnsupportedApps">{{ $t("launchpad_auth.not_integrated_apps") }}</span>
      </p>
      <div
        class="apps-list px-2"
        v-if="apps.length > 0"
      >
        <a
          class="app-item-container"
          v-for="app in apps.filter((app) => app.app_type === 'standalone').sort((a, b) => a.name.localeCompare(b.name))"
          :href="app.main_url"
          :key="app.id ?? app.name"
        >
          <div class="app-item-icon-container">
            <img
              :src="app.icon"
              :alt="app.name"
              width="160"
              height="160"
            >
            <div
              class="app-item-icon-overlay"
              v-if="!app.supports_cas"
            >
              <FontAwesomeIcon
                class="app-item-unsupported-icon"
                icon="fa-solid fa-screwdriver-wrench"
              />
            </div>
          </div>
          <div class="app-item-text-container">
            <p class="text-sm font-medium">
              {{ app.name }}
            </p>
            <p class="text-xs text-slate-600">
              {{ app.description }}
            </p>
          </div>
        </a>
      </div>
    </div>
    <div>
      <div class="mt-8 lg:mt-2">
        <p class="text-3xl font-medium">
          {{ $t("launchpad_auth.libraries") }}
        </p>
        <i18n-t
          :keypath="$props.authorized ? 'launchpad_auth.libraryeditrequest' : 'launchpad_unauth.libraryeditrequest' "
          tag="p"
          class="mt-2 text-slate-500"
        >
          <template #requestaccesslink>
            <!-- New Instructor Verification Req URL-->
            <a
              href="/instructor"
              target="_blank"
              rel="noreferer"
              class="text-accent"
            >
              {{ $t("launchpad_auth.requestaccess") }}.
            </a>
            <span v-if="$props.authorized">
              {{ $t("launchpad_auth.libraryeditinfo") }}
            </span>
          </template>
        </i18n-t>
        <div
          class="apps-list px-2"
          v-if="libs.length > 0"
        >
          <a
            class="app-item-container"
            v-for="lib in libs"
            :href="lib.main_url"
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
                class="app-item-icon-overlay"
                v-if="hasEditAccess(lib.name)"
              >
                <FontAwesomeIcon
                  class="app-item-key-icon"
                  icon="fa-solid fa-key"
                />
              </div>
            </div>
            <div class="app-item-text-container">
              <p class="text-sm font-medium">
                {{ lib.name }}
              </p>
              <p class="text-xs text-slate-600">
                {{ lib.description }}
              </p>
            </div>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { Application } from '@server/types/applications';
  import { usePageContext } from '@renderer/usePageContext';
  import { getUserAppsAndLibraries } from '@renderer/utils/apps';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { useAxios } from '@renderer/useAxios';
  import NotVerifiedBanner from './instructor_profile/NotVerifiedBanner.vue';
  import { Announcement } from '@server/models';
  import AnnouncementBanner from './layout/AnnouncementBanner.vue';

  // Props & Context
  const props = withDefaults(
    defineProps<{
      authorized?: boolean;
      publicApps?: Application[];
      announcements?: Announcement[];
    }>(),
    {
      authorized: false,
      publicApps: undefined,
      announcements: undefined,
    },
  );
  const pageContext = usePageContext();
  const axios = useAxios();

  // Data & UI
  const loading = ref(false);
  const apps = ref<Application[]>([]);
  const libs = ref<Application[]>([]);
  const hasUnsupportedApps = computed(() =>
    apps.value.reduce((acc, curr) => {
      if (acc) {
        return true;
      }
      if (!curr.supports_cas) {
        return true;
      }
      return false;
    }, false),
  );

  // Init
  if (props.authorized) {
    loadUsersApps();
  } else {
    loadPublicApps();
  }

  // Methods
  async function loadUsersApps() {
    try {
      // temporary fix for academy online
      const academyOnline = {
        id : "28",
        name: "Academy Online",
        app_type: "standalone",
        main_url: "https://libretexts.org/academy/online",
        cas_service_url: "https://libretexts.org/casservice",
        default_access: "none",
        icon: "https://cdn.libretexts.net/Logos/academy_full.png?v=1",
        description: "Professional Development for Instructional Staff",
        primary_color: "#127BC4",
        hide_from_apps: false,
        hide_from_user_apps: false,
        is_default_library: false,
        created_at: new Date(),
        updated_at: new Date(),
        supports_cas: true,
      }

      if (!pageContext.value?.user?.uuid) {
        throw new Error('nouuid');
      }
      if (pageContext.value.user?.apps) {
        apps.value = pageContext.value.user.apps.filter((a) => a.app_type === 'standalone');
        libs.value = pageContext.value.user.apps.filter((a) => a.app_type === 'library');
        if(pageContext.value.user?.user_type === 'instructor'){
          // @ts-ignore
          apps.value.unshift(academyOnline);
        }
        return;
      }

      loading.value = true;
      [apps.value, libs.value] = await getUserAppsAndLibraries(
        pageContext.value.user.uuid,
      );

      if (pageContext.value.user?.user_type === 'instructor'){
        // @ts-ignore
        apps.value.unshift(academyOnline);
      }

    } catch (err) {
      console.error(err);
    } finally {
      loading.value = false;
    }
  }

  async function loadPublicApps() {
    try {
      if (props.publicApps) {
        apps.value = props.publicApps.filter((a) => a.app_type === 'standalone');
        libs.value = props.publicApps.filter((a) => a.app_type === 'library');
        return;
      }

      loading.value = true;

      const res = await axios.get('/applications');
      if (!res.data.data || !Array.isArray(res.data.data)) {
        throw new Error('badres');
      }

      apps.value = res.data.data.filter((app: Application) => {
        return app.app_type === 'standalone';
      });

      libs.value = res.data.data.filter((app: Application) => {
        return app.app_type === 'library';
      });
    } catch (err) {
      console.error(err);
    } finally {
      loading.value = false;
    }
  }

  // User has edit access to a library if they
  function hasEditAccess(name: string): boolean {
    if (!props.authorized) return false;
    if (apps.value.map((app) => app.name).includes(name)) {
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
.app-item-icon-overlay {
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
.app-item-unsupported-icon {
  color: #127bc4;
  font-size: 0.9rem;
}
.app-item-text-container {
  display: flex;
  flex-direction: column;
  text-align: center;
  margin-top: 0.25rem;
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
