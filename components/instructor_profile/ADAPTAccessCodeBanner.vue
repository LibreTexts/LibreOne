<template>
  <div class="p-4 mb-4 text-sm text-white rounded-lg bg-blue-600" role="alert">
    <p class="font-medium text-white">
      {{ $t("instructor.adapt_access_header") }}
    </p>
    <p>
      {{ $t("instructor.adapt_access_msg_part_1") }}
      {{ " " }}
      <a
        href="https://adapt.libretexts.org/password/reset"
        target="_blank"
        rel="noreferer"
        class="hover:text-amber-100 underline"
      >
        {{ $t("common.here") }}
      </a>
      {{ " " }}
      {{ $t("instructor.adapt_access_msg_part_2") }}
      {{ " " }}
      <a
        href="https://commons.libretexts.org/support/contact?category=account"
        target="_blank"
        rel="noreferer"
        class="hover:text-amber-100 underline"
      >
        {{ $t("common.here") }}
      </a>
      .
    </p>
  </div>
</template>
