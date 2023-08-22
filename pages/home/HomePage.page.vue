<template>
  <StandardPageLayout fill-height>
    <div aria-live="polite">
      <div>
        <p class="text-3xl font-medium">
          {{ $t("home.yourlibreverse") }}
        </p>
        <p class="mt-2 italic text-gray-400">
          {{ $t("home.yourlibreversetagline") }}
        </p>
      </div>
      <div class="apps-grid px-4"
      v-if="apps.length > 0"
      >
        <div
          class="app-item-container"
          v-for="app in apps"
          @click="openAppLink(app.main_url)"
          :key="app.id ?? app.name"
        >
          <div class="app-item-icon-container">
            <img
              :src="app.icon"
              :alt="app.name"
              width="25"
              height="25"
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
  </StandardPageLayout>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import StandardPageLayout from '../../components/layout/StandardPageLayout.vue';
  import { Application } from '@server/models';
  import { useAxios } from '@renderer/useAxios';

  const axios = useAxios();

  const loading = ref(false);
  const apps = ref<Application[]>([]);

  loadApps();
  async function loadApps(){
    try {
      loading.value = true;
      const appRes = await axios.get('/applications');
      if(!appRes || !appRes.data || !appRes.data.data || !Array.isArray(appRes.data.data)){
        throw new Error('badres');
      }
      apps.value = appRes.data.data;
    } catch (err) {
      console.error(err);
    } finally {
      loading.value = false;
    }
  }

  function openAppLink(href: string) {
    window.open(href, '_blank');
  }
</script>
<style lang="css" scoped>
.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  grid-gap: 1rem;
  margin-top: 2rem;
}
.app-item-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-items: center;
  text-align: center;
  width: 12rem;
  height: 12rem;
  padding: 0.5rem;
  cursor: pointer;
}
.app-item-icon-container {
  display: flex;
  width: 75%;
  height: 60%;
  border-radius: 5px;
  background-color: #e5e7eb;
  align-items: center;
  justify-content: center;
}
.app-item-icon-container:hover {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}
.app-item-text-container {
  display: flex;
  flex-direction: column;
  text-align: center;
  margin-top: 0.75rem;
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
