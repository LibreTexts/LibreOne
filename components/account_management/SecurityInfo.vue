<template>
  <div :aria-busy="isLoading">
    <div v-if="user?.external_idp" class="flex flex-col text-center my-6">
      <p class="text-md font-medium">{{ $t("security.external") }}</p>
    </div>
    <div v-else>
      <p class="text-xl font-medium">
        {{ $t("security.securityinfo") }}
      </p>
      <div class="flex-grow border-t border-gray-400"></div>

      <div v-if="editEmail">
        <NewEmailForm
          :user="user"
          @data-updated="$emit('data-updated')"
          @set-unknown-error="$emit('set-unknown-error', $event)"
        />
      </div>

      <div v-else-if="editPassword">
        <NewPasswordForm
          :user="user"
          @password-changed="$emit('data-updated')"
          @set-unknown-error="$emit('set-unknown-error', $event)"
        />
      </div>

      <div v-else>
        <div class="mt-4">
          <p class="text-sm font-light">{{ $t("common.email") }}</p>
          <p class="font-semibold">{{ user?.email }}</p>
          <ThemedButton
            @click="() => (editEmail = true)"
            small
            class="mt-2"
            variant="outlined"
            >{{ $t("security.changeemail") }}
          </ThemedButton>
        </div>

        <div class="mt-10">
          <p class="text-sm font-light">{{ $t("security.lastchanged") }}</p>
          <p class="font-semibold">
            {{ formattedLastChange }}
          </p>
          <ThemedButton
            variant="outlined"
            class="mt-2"
            @click="() => (editPassword = true)"
            small
            >{{ $t("security.changepassword") }}
          </ThemedButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, computed } from "vue";
import ThemedButton from "../ThemedButton.vue";
import NewEmailForm from "./NewEmailForm.vue";
import NewPasswordForm from "./NewPasswordForm.vue";
import { useI18n } from "vue-i18n";

const emit = defineEmits<{
  (e: "set-unknown-error", error: boolean): void;
  (e: "data-updated"): void;
}>();
const props = defineProps<{ user?: Record<string, string> }>();
const { t } = useI18n();

const editEmail = ref(false);
const editPassword = ref(false);
const currentPassword = ref("");
const newPassword = ref("");
const newPasswordConfirm = ref("");
const newPasswordError = ref(false);
const isLoading = ref(false);
const formattedLastChange = computed(() => {
  if (!props.user?.last_password_change) return t("security.never");
  const dateStr = new Date(props.user?.last_password_change).toLocaleDateString(
    "en-US",
    { timeZone: "UTC" }
  );
  const timeStr = new Date(props.user?.last_password_change).toLocaleTimeString(
    "en-US",
    { timeZone: "UTC" }
  );
  return `${dateStr} at ${timeStr} (UTC)`;
});

// Reset state when switching between email and password. User can only edit one at a time
watch(
  () => [editEmail, editPassword],
  () => {
    if (editEmail.value) {
      editPassword.value = false;
      currentPassword.value = "";
      newPassword.value = "";
      newPasswordConfirm.value = "";
      newPasswordError.value = false;
    }
    if (editPassword.value) {
      editEmail.value = false;
    }
  }
);
</script>
