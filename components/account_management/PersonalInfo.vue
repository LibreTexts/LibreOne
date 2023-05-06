<template>
  <div>
    <p class="text-xl font-medium">{{ $t("profile.personalinfo") }}</p>
    <div class="flex-grow border-t border-gray-400"></div>

    <div v-if="editMode">
      <form class="lg:mt-4" @submit="submitForm">
        <div class="my-4">
          <label for="first_name_input" class="block text-sm font-medium">
            {{ $t("profile.firstname") }}
          </label>
          <input
            id="first_name_input"
            type="text"
            aria-required="true"
            v-model="firstName"
            :placeholder="$t('profile.firstname')"
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
        <div class="my-4">
          <label for="last_name_input" class="block text-sm font-medium">
            {{ $t("profile.lastname") }}
          </label>
          <input
            id="last_name_input"
            type="text"
            aria-required="true"
            v-model="lastName"
            :placeholder="$t('profile.lastname')"
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
        <p class="text-sm font-light">{{ $t("profile.firstname") }}</p>
        <p class="font-medium">{{ user.first_name }}</p>
      </div>

      <div class="my-4">
        <p class="text-sm font-light mt-4">{{ $t("profile.lastname") }}</p>
        <p class="font-medium">{{ user.last_name }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { User } from "@server/models";
const props = withDefaults(defineProps<{ user: User; editMode: boolean }>(), {
  editMode: false,
});

const firstName = ref("");
const lastName = ref("");

init();
function init() {
  firstName.value = props.user.first_name;
  lastName.value = props.user.last_name;
}

async function submitForm() {
  console.log("submit");
}
</script>
