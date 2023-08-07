<template>
  <div v-bind="$attrs">
    <form @submit="submitPasswordChange">
      <ThemedInput
        id="current_password_input"
        :label="$t('security.currentpassword')"
        aria-required="true"
        v-model="currentPassword"
        :placeholder="$t('security.currentpassword')"
        class="mt-4"
      />
      <ThemedInput
        id="new_password_input"
        :label="$t('security.newpassword')"
        aria-required="true"
        v-model="newPassword"
        :placeholder="$t('security.newpassword')"
        class="mt-12"
      />
      <PasswordStrengthMeter :strength="passStrength" class="mt-2" />
      <ThemedInput
        id="confirm_new_password_input"
        :label="$t('security.confirmnewpassword')"
        aria-required="true"
        v-model="newPasswordConfirm"
        :placeholder="$t('security.confirmnewpassword')"
        class="mt-6"
      />
      <ThemedButton
        type="submit"
        :disabled="isLoading"
        class="mt-6"
        @click="submitPasswordChange"
        >{{ $t("common.submit") }}</ThemedButton
      >
    </form>
  </div>
</template>

<script lang="ts" setup>
import { useAxios } from "@renderer/useAxios";
import { ref, watch, computed } from "vue";
import ThemedInput from "../ThemedInput.vue";
import ThemedButton from "../ThemedButton.vue";
import PasswordStrengthMeter from "../PasswordStrengthMeter.vue";
import { getPasswordStrength } from "@renderer/utils/auth";
const emit = defineEmits<{
  (e: "set-unknown-error", error: boolean): void;
  (e: "data-updated"): void;
}>();
const axios = useAxios();

const currentPassword = ref("");
const newPassword = ref("");
const newPasswordConfirm = ref("");
const isLoading = ref(false);
const passStrength = computed(() => getPasswordStrength(newPassword.value));

const submitPasswordChange = async (e: Event) => {
  e.preventDefault();
  //TODO: POST to server here
  emit("data-updated");
};
</script>
