<template>
  <div v-bind="$attrs">
    <div class="flex flex-col md:flex-row justify-between gap-4 mb-4">
      <div>
        <h1 class="text-3xl font-medium">{{ $t("subscriptions.title") }}</h1>
        <p class="mt-2 text-left text-slate-500">
          <i18n-t keypath="subscriptions.description">
            <template #always>
              <span class="italic font-bold">{{
                $t("subscriptions.always")
              }}</span>
            </template>
          </i18n-t>
        </p>
      </div>
      <a href="/redeem">
        <ThemedButton
          variant="default"
          class="px-4 py-2 h-fit w-auto whitespace-nowrap mt-4 md:mt-0 md:ml-8"
          icon="IconKeyFilled"
        >
          {{ $t("redeem.title") }}
        </ThemedButton>
      </a>
    </div>

    <div
      v-if="userLicenses.length === 0"
      class="text-center py-8 text-gray-500"
    >
      {{ $t("subscriptions.no-active-subscriptions") }}
    </div>

    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8 max-h-[600px] overflow-y-auto px-2 pb-2"
    >
      <LicenseCard
        v-for="license in userLicenses"
        :key="license.application_license_id"
        :license="license"
        @manage="manageLicense"
      />
    </div>

    <ThemedButton
      @click="browseLicenses"
      variant="default"
      class="w-full py-3 text-center"
      icon="IconShoppingCartFilled"
    >
      {{ $t("subscriptions.browse-store") }}
    </ThemedButton>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { useAxios } from "@renderer/useAxios";
import { usePageContext } from "@renderer/usePageContext";
import ThemedButton from "../ThemedButton.vue";
import LicenseCard from "./LicenseCard.vue";

interface License {
  application_license_id: string;
  granted_by: string;
  expires_at: string;
  original_purchase_date: string;
  revoked: boolean;
  revoked_at: string;
  application_license: {
    uuid: string;
    name: string;
    duration_days: number;
    perpetual: boolean;
    picture_url: string;
  };
}

const axios = useAxios();
const pageContext = usePageContext().value;

const userLicenses = ref<License[]>([]);
const isLoading = ref(false);

async function fetchUserLicenses() {
  try {
    isLoading.value = true;
    if (!pageContext.user?.uuid) return;

    const response = await axios.get(
      `/app-licenses/user/${pageContext.user.uuid}`
    );
    userLicenses.value = response.data.data;
  } catch (error) {
    console.error("Failed to fetch licenses:", error);
  } finally {
    isLoading.value = false;
  }
}

function manageLicense(licenseId: string) {
  console.log("Managing license:", licenseId);
}

function browseLicenses() {
  window.location.href = "https://commons.libretexts.org/store";
}

onMounted(() => {
  fetchUserLicenses();
});
</script>
