<template>
  <div :aria-busy="isLoading">
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
        <p class="font-medium">{{ user?.first_name }}</p>
      </div>

      <div class="my-4">
        <p class="text-sm font-light mt-4">{{ $t("profile.lastname") }}</p>
        <p class="font-medium">{{ user?.last_name }}</p>
      </div>
    </div>
    <ThemedButton
      @click="(e) => editMode ? submitForm(e) : editMode = true"
      :variant="editMode ? 'save' : 'default'"
      class="mt-10"
    >
      <span>{{ editMode ? $t("common.save") : $t("common.edit") }}</span>
    </ThemedButton>
  </div>
</template>

<script lang="ts" setup>
import { useAxios } from "@renderer/useAxios";
import { ref, watch } from "vue";
import ThemedButton from "../ThemedButton.vue";
const emit = defineEmits<{
  (e: "set-unknown-error", error: boolean): void;
  (e: 'data-updated'): void;
}>();
const props = defineProps<{ user?: Record<string, string> }>();

const axios = useAxios();

const editMode = ref(false);
const firstName = ref("");
const lastName = ref("");
const firstErr = ref(false);
const lastErr = ref(false);
const isDirty = ref(false);
const isLoading = ref(false);

// Intialize the form with the user's current name
firstName.value = props.user?.first_name ?? "";
lastName.value = props.user?.last_name ?? "";

// Watch for changes to the form fields and set the dirty flag
watch(
  () => [firstName.value, lastName.value],
  () => {
    if (isDirty.value) return; // Don't set dirty flag if already dirty
    isDirty.value = true;
  }
);

/**
 * Resets the error states of all form fields.
 */
function resetFormErrors() {
  firstErr.value = false;
  lastErr.value = false;
}

/**
 * Validates all fields in the form and sets error states, if necessary.
 */
function validateForm() {
  let valid = true;
  if (
    firstName.value.trim().length < 1 ||
    firstName.value.trim().length > 100
  ) {
    valid = false;
    firstErr.value = true;
  }
  if (lastName.value.trim().length < 1 || lastName.value.trim().length > 100) {
    valid = false;
    lastErr.value = true;
  }
  return valid;
}

/**
 * Validates form fields and emits an event to parent to
 * request the user's info be saved to server if changed.
 * @param e Form submission event
 */
async function submitForm(e: Event) {
  try {
    e.preventDefault();
    resetFormErrors();
    if (!validateForm()) return;
    if (!isDirty.value) {
      editMode.value = false;
      return;
    }

    if (!firstName || !lastName || !props.user || !props.user.uuid) {
      throw new Error("badreq");
    }

    isLoading.value = true;
    const response = await axios.patch(`/users/${props.user.uuid}`, {
      first_name: firstName.value,
      last_name: lastName.value,
    });

    if (!response.data) {
      throw new Error("badres");
    }

    editMode.value = false;
    emit("data-updated");
  } catch (error) {
    emit("set-unknown-error", true);
  } finally {
    isLoading.value = false;
  }
}
</script>
