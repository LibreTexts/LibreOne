<template>
  <StandardPageLayout>
    <div aria-live="polite">
      <!--Content Header-->
      <div class="flex justify-between">
        <div class="flex flex-col">
          <p class="text-3xl font-medium">
            {{ $t("delete-account.header") }}
          </p>
          <p class="mt-4 text-lg">
            {{ $t("delete-account.infoline_1") }}
          </p>
          <ul class="mt-4 text-lg list-disc ml-8">
            <li>{{ $t("delete-account.consequences_1") }}</li>
            <li>{{ $t("delete-account.consequences_2") }}</li>
            <li>{{ $t("delete-account.consequences_3") }}</li>
          </ul>
          <i18n-t
            keypath="delete-account.infoline_2"
            tag="p"
            class="mt-4 text-lg"
          >
            <template #privpolicy>
              <a
                href="https://libretexts.org/privacy/"
                target="_blank"
                rel="noreferer"
                class="text-accent"
              >
                {{ $t("common.privpolicy") }}
              </a>
            </template>
          </i18n-t>
          <p class="mt-8 text-xl font-medium">
            {{ $t("delete-account.steps_header") }}
          </p>
          <p class="mt-4 text-lg">
            {{ $t("delete-account.steps_infoline") }}
          </p>
          <ol class="mt-4 text-lg list-decimal ml-8">
            <li v-if="!isAuthorized">{{ $t("delete-account.step_1") }}</li>
            <i18n-t keypath="delete-account.step_2" tag="li">
            <template #securitylink>
              <a
                href="/security"
                class="text-accent"
              >
                {{ $t("profile.security") }}
              </a>
            </template>
          </i18n-t>
            <li>{{ $t("delete-account.step_3") }}</li>
            <li>{{ $t("delete-account.step_4") }}</li>
            <li>{{ $t("delete-account.step_5") }}</li>
          </ol>
          <p class="mt-4 text-lg">
            {{ $t("delete-account.result") }}
          </p>
          <i18n-t keypath="delete-account.contact" tag="p" class="mt-8 text-lg">
            <template #supportlink>
              <a
                href="https://commons.libretexts.org/support/contact"
                target="_blank"
                rel="noreferer"
                class="text-accent"
              >
                {{ $t("common.here") }}
              </a>
            </template>
          </i18n-t>
          <p class="mt-8 text-lg text-slate-500">
            {{ $t("delete-account.thankyou") }}
          </p>
        </div>
      </div>
    </div>
  </StandardPageLayout>
</template>

<script lang="ts" setup>
import StandardPageLayout from "../../components/layout/StandardPageLayout.vue";
import { useAuthStatus } from "@renderer/useAuthStatus";

const isAuthorized = useAuthStatus();
</script>
