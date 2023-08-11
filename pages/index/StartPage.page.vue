<template>
  <div class="flex flex-col flex-wrap h-screen items-center justify-center bg-gradient-to-r from-blue-750 to-sky-550">
    <div class="w-1/2 flex flex-col flex-wrap items-center justify-center">
      <h1 class="text-5xl font-semibold my-2 text-white">
        {{ $t('common.brand') }}
      </h1>
      <p class="text-xl text-white my-2 text-center">
        {{ $t('common.tagline') }}
      </p>
      <a
        class="w-3/4 h-12 flex bg-sky-400 rounded-md text-white text-lg my-2 items-center justify-center"
        href="/register"
      >
        {{ $t('welcome.getstarted') }}
      </a>
    </div>
  </div>
</template>
