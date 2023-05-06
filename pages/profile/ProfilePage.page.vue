<template>
  <LibreOneHeader />
  <div
    class="bg-zinc-100 grid grid-flow-col justify-items-center items-center min-h-screen"
  >
    <div class="w-11/12 h-screen mt-4 md:h-auto md:mt-0">
      <div
        class="bg-white p-6 shadow-md shadow-gray-400 rounded-md overflow-hidden"
      >
        <Transition
          mode="out-in"
          enter-from-class="motion-safe:translate-x-full"
          enter-to-class="motion-safe:translate-x-0"
          leave-from-class="motion-safe:translate-x-0"
          leave-to-class="motion-safe:-translate-x-full"
          enter-active-class="motion-safe:transition-transform motion-safe:ease-out motion-safe:duration-500"
          leave-active-class="motion-safe:transition-transform motion-safe:ease-in motion-safe:duration-300"
        >
          <div aria-live="polite" :aria-busy="loading">
            <h1 class="text-left text-3xl font-medium">
              {{ $t("profile.profile") }}
            </h1>
            <p class="mt-2 text-left">
              {{ $t("profile.infoline") }}
            </p>
            <p
              class="text-error font-medium text-center mt-4 mb-6"
              v-if="unknownerror"
            >
              {{ $t("common.unknownerror") }}
            </p>
            <div class="mt-2 flex flex-col-reverse">
              <div class="basis-2/3 my-4">
                <PersonalInfo
                  :user="user"
                  class="mb-10"
                  :edit-mode="editMode"
                />
                <button
                  @click="editMode = !editMode"
                  class="inline-flex items-center justify-center h-10 bg-primary p-2 mt-2 rounded-md text-white w-full font-medium hover:bg-sky-700 hover:shadow"
                >
                  <span>{{
                    editMode ? $t("common.save") : $t("common.edit")
                  }}</span>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import LibreOneHeader from "../../components/LibreOneHeader.vue";
import PersonalInfo from "../../components/account_management/PersonalInfo.vue";
import { User } from "@server/models";
const editMode = ref(false);
const loading = ref(false);
const unknownerror = ref(false);
const user = ref({
  first_name: "",
  last_name: "",
  email: "",
} as User);
</script>
