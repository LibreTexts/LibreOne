<template>
  <button
    class="app-switcher shadow-[0_2px_5px_-1px_rgba(0,0,0,0.2)] hover:shadow-[0_2px_5px_-1px_rgba(0,0,0,0.3)] rounded-md p-2 mr-5"
    @click="isOpen = !isOpen"
    @keydown.prevent.enter="isOpen = !isOpen"
    tabindex="0"
    :class="
      isOpen
        ? 'shadow-[0_2px_5px_-1px_rgba(0,0,0,0.3)] rounded-md  '
        : ''
    "
  >
  
    <FontAwesomeIcon
      :icon="faRocket"
      class="text-primary rounded-md"
      size="2x"
    />
    <ul
      v-if="isOpen"
      class="switcher-menu"
      role="toolbar"
      tabindex="-1"
      :aria-expanded="isOpen"
    >
      <li
        class="switcher-item"
        v-for="(item, idx) in apps"
        :key="idx"
        role="button"
        tabindex="0"
        @click="openAppSwitcherLink(item.main_url)"
        @keydown.prevent.enter="openAppSwitcherLink(item.main_url)"
        @focusout="handleFocusOut(idx)"
      >
        <div class="switcher-item-icon-container">
          <img
            :src="item.icon"
            :alt="item.name"
            width="25"
            height="25"
          >
        </div>
        <div class="switcher-item-text-container">
          <p class="switcher-item-header text-muted">
            {{ item.name }}
          </p>
          <p class="switcher-item-descrip">
            {{ item.description }}
          </p>
        </div>
      </li>
      <li
        class="switcher-item"
        key="all-apps"
        role="button"
        tabindex="0"
        @click="openAppSwitcherLink('/home')"
        @keydown.prevent.enter="openAppSwitcherLink('/home')"
        @focusout="handleFocusOut(apps.length - 1)"
      >
        <div class="switcher-view-all mx-auto">
          <p class="switcher-item-header">
            View All
          </p>
        </div>
      </li>
    </ul>
  </button>
  <a href="/home">
    <img
      src="@renderer/libretexts_logo.png"
      alt="Home"
      class="h-9 w-auto"
    >
  </a>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { faRocket } from '@fortawesome/free-solid-svg-icons';
  import { Application } from '@server/types/applications';
  import { usePageContext } from '@renderer/usePageContext';
  import { getUserAppsAndLibraries } from '@renderer/utils/apps';

  const pageContext = usePageContext().value;

  const isOpen = ref<boolean>(false);
  const apps = ref<Application[]>([]);

  loadApps();
  async function loadApps() {
    try {
      if (!pageContext?.user?.uuid) {
        throw new Error('nouuid');
      }

      if (pageContext.user?.apps) {
        apps.value = pageContext.user?.apps;
        return;
      }

      const [appRes, libRes] = await getUserAppsAndLibraries(
        pageContext.user.uuid,
      );

      apps.value = [...appRes.filter((app) => app.app_type === 'standalone'), ...libRes];
    } catch (err) {
      console.error(err);
    }
  }

  function openAppSwitcherLink(href: string) {
    window.open(href, '_blank');
  }

  function handleFocusOut(idx: number) {
    if (idx === apps.value.length - 1) {
      isOpen.value = false;
    }
  }
</script>

<style scoped lang="css">
.app-switcher {
  position: relative;
  display: flex;
}
.switcher-menu {
  position: absolute;
  display: block;
  left: 0;
  top: calc(100% + 0.8rem);
  width: 15rem;
  max-height: 27rem;
  overflow-y: auto;
  background-color: #fff;
  border-radius: 5px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.1);
  z-index: 100;
}
.switcher-item {
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;
}
.switcher-item-small {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.7rem;
  font-style: italic;
  padding-top: 0.1rem;
  padding-bottom: 0.1rem;
}
.switcher-item:hover {
  background-color: #f9fafb;
}
.switcher-item-icon-container {
  width: 2rem;
  height: 2rem;
  border-radius: 5px;
  background-color: #e5e7eb;
  display: flex;
  flex-basis: 17.5%;
  align-items: center;
  justify-content: center;
  margin-right: 0.5rem;
}
.switcher-item-text-container {
  display: flex;
  flex-direction: column;
  text-align: left;
  flex-wrap: wrap;
  flex-basis: 82.5%;
}
.switcher-item-header {
  font-size: 0.9rem;
  font-weight: 500;
}
.switcher-item-descrip {
  font-size: 0.7rem;
  color: #6b7280;
}
.switcher-view-all {
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}
</style>
