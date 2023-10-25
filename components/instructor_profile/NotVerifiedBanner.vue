<template>
  <div
    class="p-4 mb-4 text-sm text-white rounded-lg bg-blue-600"
    role="alert"
  >
    <p class="font-medium text-white">
      {{ $t("instructor.verify_reminder_header") }}
    </p>
    <p>
      {{ $t("instructor.verify_reminder_msg") }}
      {{ ' ' }}
      <a
        href="/instructor"
        target="_blank"
        rel="noreferer"
        class="hover:text-amber-100"
      >
        {{ $t("instructor.verify_reminder_link") }}
      </a>
    </p>
  </div>
</template>
