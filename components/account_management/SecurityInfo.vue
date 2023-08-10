<template>
  <div :aria-busy="isLoading">
    <p class="text-xl font-medium">
      {{ $t("security.security") }}
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
        @data-updated="$emit('data-updated')"
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
          {{
            user?.last_password_change
              ? user.last_password_change
              : $t("security.never")
          }}
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
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import { useAxios } from "@renderer/useAxios";
import ThemedButton from "../ThemedButton.vue";
import NewEmailForm from "./NewEmailForm.vue";
import NewPasswordForm from "./NewPasswordForm.vue";
const emit = defineEmits<{
  (e: "set-unknown-error", error: boolean): void;
  (e: "data-updated"): void;
}>();
const props = defineProps<{ user?: Record<string, string> }>();
const axios = useAxios();

const editEmail = ref(false);
const editPassword = ref(false);
const currentPassword = ref("");
const newPassword = ref("");
const newPasswordConfirm = ref("");
const newPasswordError = ref(false);
const isDirty = ref(false);
const isLoading = ref(false);

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

async function submitForm() {
  // TODO: Validate form
}
</script>
