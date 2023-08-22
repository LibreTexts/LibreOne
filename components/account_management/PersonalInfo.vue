<template>
  <div :aria-busy="isLoading">
    <p class="text-xl font-medium">
      {{ $t("profile.personalinfo") }}
    </p>
    <div class="flex-grow border-t border-gray-400" />
    <div v-if="editMode">
      <form
        class="lg:mt-4"
        @submit="submitForm"
      >
        <ThemedInput
          id="first_name_input"
          :label="$t('profile.firstname')"
          :placeholder="$t('profile.firstname')"
          v-model="firstName"
          required
          class="my-4"
        />
        <ThemedInput
          id="last_name_input"
          :label="$t('profile.lastname')"
          :placeholder="$t('profile.lastname')"
          v-model="lastName"
          required
          class="my-4"
        />
      </form>
    </div>
    <div v-else>
      <div class="my-4">
        <p class="text-sm font-light">
          {{ $t("profile.firstname") }}
        </p>
        <p class="font-medium">
          {{ user?.first_name }}
        </p>
      </div>

      <div class="my-4">
        <p class="text-sm font-light mt-4">
          {{ $t("profile.lastname") }}
        </p>
        <p class="font-medium">
          {{ user?.last_name }}
        </p>
      </div>
    </div>
    <ThemedButton
      @click="(e) => (editMode ? submitForm(e) : (editMode = true))"
      :variant="editMode ? 'save' : 'default'"
      class="mt-10"
    >
      <span>{{ editMode ? $t("common.save") : $t("common.edit") }}</span>
    </ThemedButton>
  </div>
</template>

<script lang="ts" setup>
  import { useAxios } from '@renderer/useAxios';
  import { ref, watch } from 'vue';
  import ThemedButton from '../ThemedButton.vue';
  import ThemedInput from '../ThemedInput.vue';
  const emit = defineEmits<{
    (e: 'set-unknown-error', error: boolean): void;
    (e: 'data-updated'): void;
  }>();
  const props = defineProps<{ user?: Record<string, string> }>();

  const axios = useAxios();

  const editMode = ref(false);
  const firstName = ref('');
  const lastName = ref('');
  const firstErr = ref(false);
  const lastErr = ref(false);
  const isDirty = ref(false);
  const isLoading = ref(false);

  // Intialize the form with the user's current name
  firstName.value = props.user?.first_name ?? '';
  lastName.value = props.user?.last_name ?? '';

  // Watch for changes to the form fields and set the dirty flag
  watch(
    () => [firstName.value, lastName.value],
    () => {
      if (isDirty.value) return; // Don't set dirty flag if already dirty
      isDirty.value = true;
    },
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

      if (!firstName.value || !lastName.value || !props.user || !props.user.uuid) {
        throw new Error('badreq');
      }

      isLoading.value = true;
      const response = await axios.patch(`/users/${props.user.uuid}`, {
        first_name: firstName.value,
        last_name: lastName.value,
      });

      if (!response.data) {
        throw new Error('badres');
      }

      editMode.value = false;
      emit('data-updated');
    } catch (error) {
      emit('set-unknown-error', true);
    } finally {
      isLoading.value = false;
    }
  }
</script>
