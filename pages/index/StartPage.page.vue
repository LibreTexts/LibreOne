<template>
  <div class="flex flex-col flex-wrap h-screen items-center justify-center">
    <div class="w-1/2 flex flex-col flex-wrap items-center justify-center">
      <a href="https://libretexts.org">
        <img
          src="@renderer/libretexts_logo.png"
          class="h-32 mb-4"
        >
      </a>
      <h1 class="text-xl font-semibold text-primary hidden">
        {{ $t("common.brand") }}
      </h1>
      <a
        class="w-3/4 h-12 flex bg-primary rounded-md text-white text-lg my-2 items-center justify-center shadow-md hover:shadow-xl"
        href="/register"
      >
        {{ $t("welcome.register") }}
      </a>
      <a
        class="w-3/4 h-12 flex bg-primary rounded-md text-white text-lg my-2 items-center justify-center shadow-md hover:shadow-xl"
        :href="props.loginURL"
      >
        {{ $t("welcome.signin") }}
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
  const props = defineProps<{
    loginURL: string;
  }>();
</script>