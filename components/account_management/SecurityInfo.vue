<template>
  <div>
    <p class="text-xl font-medium">
      {{ $t("security.security") }}
    </p>
    <div class="flex-grow border-t border-gray-400"></div>

    <div v-if="editMode">
      <form class="lg:mt-4" @submit="submitForm">
        <div class="my-4">
          <label for="email_input" class="block text-sm font-medium">
            {{ $t("common.email") }}
          </label>
          <input
            id="email_input"
            type="text"
            aria-required="true"
            v-model="email"
            :placeholder="$t('common.email')"
            :class="[
              'border',
              'block',
              'h-10',
              'mt-2',
              'w-full',
              'rounded-md',
              'px-2',
              'placeholder:text-slate-400',
              'placeholder:font-light',
            ]"
          />
        </div>
      </form>
    </div>

    <div v-else>
      <div class="my-4">
        <p class="text-sm font-light">{{ $t("common.email") }}</p>
        <p class="font-semibold">{{ user.email }}</p>
      </div>

      <div class="my-4">
        <p class="text-sm font-light">{{ $t("security.lastchanged") }}</p>
        <p class="font-semibold">
          {{
            user.last_password_change
              ? user.last_password_change
              : $t("security.never")
          }}
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { User } from "@server/models";
const props = withDefaults(
  defineProps<{
    user: User;
    editMode: boolean;
  }>(),
  {
    editMode: false,
  }
);

const email = ref("");

async function submitForm() {
  console.log("submit");
}
</script>
