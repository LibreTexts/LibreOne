<template>
  <div class="bg-zinc-100 grid grid-flow-col justify-items-center items-center min-h-screen py-10">
    <div class="w-11/12">
      <img
        src="@renderer/libretexts_logo.png"
        alt="LibreTexts"
        class="max-w-xs my-0 mx-auto"
      >
      <div
        class="bg-white p-6 mt-6 shadow-md shadow-gray-400 rounded-md overflow-hidden"
        aria-live="polite"
      >
        <h1 class="text-center text-3xl font-medium">
          {{ $t('dashboard.header') }}
        </h1>
        <table class="border-collapse border-spacing-2 w-full my-4 border border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-800 text-sm shadow-sm">
          <thead class="bg-slate-50 dark:bg-slate-700">
            <tr>
              <th class="w-1/2 border border-slate-300 dark:border-slate-600 font-semibold p-4 text-slate-900 dark:text-slate-200 text-left">
                {{ $t('dashboard.property') }}
              </th>
              <th class="w-1/2 border border-slate-300 dark:border-slate-600 font-semibold p-4 text-slate-900 dark:text-slate-200 text-left">
                {{ $t('dashboard.value') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="w-1/2 border border-slate-300 dark:border-slate-600 font-semibold p-4 text-slate-900 dark:text-slate-200 text-left">
                {{ $t('profile.firstname') }}
              </td>
              <td class="w-1/2 border border-slate-300 dark:border-slate-600 font-semibold p-4 text-slate-900 dark:text-slate-200 text-left">
                {{ pageContext.user?.first_name }}
              </td>
            </tr>
            <tr>
              <td class="w-1/2 border border-slate-300 dark:border-slate-600 font-semibold p-4 text-slate-900 dark:text-slate-200 text-left">
                {{ $t('profile.lastname') }}
              </td>
              <td class="w-1/2 border border-slate-300 dark:border-slate-600 font-semibold p-4 text-slate-900 dark:text-slate-200 text-left">
                {{ pageContext.user?.last_name }}
              </td>
            </tr>
            <tr>
              <td class="w-1/2 border border-slate-300 dark:border-slate-600 font-semibold p-4 text-slate-900 dark:text-slate-200 text-left">
                {{ $t('common.email') }}
              </td>
              <td class="w-1/2 border border-slate-300 dark:border-slate-600 font-semibold p-4 text-slate-900 dark:text-slate-200 text-left">
                {{ pageContext.user?.email }}
              </td>
            </tr>
          </tbody>
        </table>
        <a
          href="/api/v1/auth/logout"
          class="inline-flex justify-center rounded-lg text-sm font-semibold py-2 px-3 bg-neutral text-white hover:bg-slate-700 mt-6 w-full"
        >
          {{ $t('common.logout') }}
        </a>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { usePageContext } from '@renderer/usePageContext';

  const pageContext = usePageContext();

</script>
