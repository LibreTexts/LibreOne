<template>
  <div v-bind="$attrs">
    <div v-if="formStep === 0">
      <form @submit="submitNewEmail">
        <ThemedInput
          id="new_email_input"
          :label="$t('security.newemail')"
          aria-required="true"
          v-model="newEmail"
          :placeholder="$t('common.email_placeholder')"
          class="my-4"
        />
        <ThemedButton
          @click="submitNewEmail"
          type="submit"
          :disabled="!isDirty || isLoading"
          class="mt-6"
          >{{ $t("common.submit") }}</ThemedButton
        >
      </form>
    </div>
    <div v-if="formStep === 1">
      <form @submit="submitVerifyCode">
        <p class="mt-4">{{ $t("security.verify_message") }}</p>
        <ThemedInput
          id="email_code_input"
          :label="$t('register.verify_code')"
          aria-required="true"
          v-model="verifyCode"
          placeholder="000000"
          class="my-4"
        />
        <ThemedButton
          type="submit"
          @click="submitVerifyCode"
          :disabled="!isDirty || isLoading"
          class="mt-6"
          >{{ $t("common.submit") }}</ThemedButton
        >
      </form>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useAxios } from "@renderer/useAxios";
import { ref, watch } from "vue";
import ThemedInput from "../ThemedInput.vue";
import ThemedButton from "../ThemedButton.vue";
const emit = defineEmits<{
  (e: "set-unknown-error", error: boolean): void;
  (e: "data-updated"): void;
}>();
const axios = useAxios();

const formStep = ref(0);
const newEmail = ref("");
const newEmailError = ref(false);
const verifyCode = ref("");
const isDirty = ref(false);
const isLoading = ref(false);

watch(
  () => [newEmail.value],
  () => {
    isDirty.value = true;
  }
);

const submitNewEmail = async (e: Event) => {
  e.preventDefault();
  //TODO: POST to server here
  return (formStep.value = 1);
};

const submitVerifyCode = async (e: Event) => {
  e.preventDefault();
  //TODO: POST to server here
  emit("data-updated");
};
</script>
