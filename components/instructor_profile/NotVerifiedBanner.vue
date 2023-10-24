<template>
  <div
    class="p-4 mb-4 text-sm text-white rounded-lg bg-blue-600"
    role="alert"
  >
    <p class="font-medium text-white">
      {{ $t("instructor.verify_reminder_header") }}
    </p>
    <i18n-t
      keypath="instructor.verify_reminder_msg"
      tag="p"
    >
      <template #instructorVerificationLink>
        <a
          href="/instructor"
          target="_blank"
          rel="noreferer"
          class="text-yellow-400 hover:text-yellow-100"
        >
          {{ $t("common.here") }}
        </a>
      </template>
    </i18n-t>
  </div>
</template>
