<template>
  <div class="min-h-full bg-white md:grid md:min-h-screen md:grid-cols-[5fr_7fr]">
    <aside class="flex flex-col gap-3.5 bg-primary px-5 pb-6 pt-14 text-white md:min-h-full md:justify-between md:p-14">
      <img
        src="@renderer/libretexts_logo_white.png"
        alt="LibreTexts"
        class="h-14 w-auto max-w-none self-start min-[1100px]:h-20"
      >
      <p class="text-base leading-snug md:hidden">
        {{ headline }}
      </p>
      <div class="hidden flex-col gap-5 md:flex">
        <h2 class="text-4xl font-bold leading-tight tracking-tight text-balance">
          {{ headline }}
        </h2>
        <p class="text-xl leading-normal">
          {{ supporting }}
        </p>
      </div>
      <p class="hidden text-sm md:block">
        {{ footer }}
      </p>
    </aside>
    <div class="flex items-center justify-center px-5 py-6 md:px-12 md:py-12">
      <div class="w-full max-w-[420px]">
        <slot />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  defineProps<{
    headline: string;
    supporting?: string;
    footer?: string;
  }>();
</script>
