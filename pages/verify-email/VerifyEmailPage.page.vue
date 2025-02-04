<template>
  <div
    class="bg-zinc-100 grid grid-flow-col justify-items-center items-center min-h-screen py-10"
  >
    <div class="w-11/12 md:w-3/4">
      <img
        src="@renderer/libretexts_logo.png"
        alt="LibreTexts"
        class="max-w-xs my-0 mx-auto"
      />
      <div
        class="bg-white p-6 mt-6 shadow-md shadow-gray-400 rounded-md overflow-hidden"
      >
        <h1 class="text-center text-3xl font-medium">
          {{
            props.verificationSuccess
              ? $t("register.verify_recovery_success_header")
              : $t("register.verify_recovery_failure_header")
          }}
        </h1>
        <p class="text-center mt-4" v-if="props.verificationSuccess">
          {{ $t("register.verify_thanks") }}
        </p>
        <div class="mt-4" v-if="props.verificationSuccess">
          <a
            href="/home"
            class="inline-flex items-center justify-center h-10 bg-primary p-2 mt-2 rounded-md text-white w-full font-medium hover:bg-sky-700 hover:shadow"
          >
            <span>{{ $t("common.continue") }}</span>
            <FontAwesomeIcon
              icon="fa-solid fa-circle-arrow-right"
              class="ml-2"
            />
          </a>
        </div>
        <div class="mt-4" v-if="!props.verificationSuccess">
          <i18n-t keypath="register.verify_recovery_failure_message" tag="p" class="mt-8 text-center text-lg">
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
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const props = defineProps<{
  verificationSuccess?: boolean;
}>();
</script>
