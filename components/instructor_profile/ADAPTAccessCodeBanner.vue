<template>
  <div
    class="p-4 mb-4 text-sm text-white rounded-lg bg-blue-600"
    role="alert"
  >
    <p class="font-medium text-white">
      {{ $t("instructor.adapt_access_header") }}
    </p>
    <p>
      {{ $t("instructor.adapt_access_msg") }}
      {{ ' ' }}
      <a
        href="https://commons.libretexts.org/support/contact?category=adaptcode&priority=medium"
        target="_blank"
        rel="noreferer"
        class="hover:text-amber-100 underline"
      >
        {{ $t("instructor.adapt_access_link") }}
      </a>
    </p>
  </div>
</template>
