<template>
  <StandardPageLayout>
    <div aria-live="polite" :aria-busy="loading">
      <h1 class="text-left text-3xl font-medium">
        {{ $t("security.security") }}
      </h1>
      <p class="mt-2 text-left">
        {{ $t("security.infoline") }}
      </p>
      <p
        class="text-error font-medium text-center mt-4 mb-6"
        v-if="unknownerror"
      >
        {{ $t("common.unknownerror") }}
      </p>
      <div class="mt-2 flex flex-col-reverse">
        <div class="basis-2/3 my-4">
          <SecurityInfo :user="user" class="mb-10" :edit-mode="editMode" />
          <button
            @click="editMode = !editMode"
            class="inline-flex items-center justify-center h-10 bg-primary p-2 mt-2 rounded-md text-white w-full font-medium hover:bg-sky-700 hover:shadow"
          >
            <span>{{ editMode ? $t("common.save") : $t("common.edit") }}</span>
          </button>
        </div>
      </div>
    </div>
  </StandardPageLayout>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import LibreOneHeader from "../../components/LibreOneHeader.vue";
import StandardPageLayout from "../../components/layout/StandardPageLayout.vue";
import SecurityInfo from "../../components/account_management/SecurityInfo.vue";
import { User } from "@server/models";
const editMode = ref(false);
const loading = ref(false);
const unknownerror = ref(false);
const user = ref({
  first_name: "",
  last_name: "",
  email: "",
} as User);
</script>
