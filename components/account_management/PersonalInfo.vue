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
        <div class="my-4">
          <p class="text-sm font-medium">
            {{ $t("profile.avatar") }}
          </p>
          <UserAvatar
            :src="pageContext.user?.avatar"
            :width="50"
            class="mt-1"
          />
          <input
            type="file"
            id="avatar-file-input"
            class="!hidden"
            :accept="VALID_FILE_EXTS.join(',')"
            @change="handleFileChange"
          >
          <div class="flex">
            <ThemedButton
              small
              variant="outlined"
              @click="handleOpenFileDialog"
              class="mt-1"
            >
              <span>{{ $t("profile.uploadavatar") }}</span>
            </ThemedButton>
            <span
              class="ml-2 mt-1 text-sm text-slate-500"
              v-if="fileToUploadName"
            >
              {{ fileToUploadName }}
            </span>
          </div>
        </div>
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
        <p class="text-sm font-light mt-4">
          {{ $t("profile.avatar") }}
        </p>
        <UserAvatar
          :src="pageContext.user?.avatar"
          :width="50"
          class="mt-1"
        />
      </div>

      <div class="my-4">
        <p class="text-sm font-light">
          {{ $t("profile.firstname") }}
        </p>
        <p class="font-medium">
          {{ pageContext.user?.first_name }}
        </p>
      </div>

      <div class="my-4">
        <p class="text-sm font-light mt-4">
          {{ $t("profile.lastname") }}
        </p>
        <p class="font-medium">
          {{ pageContext.user?.last_name }}
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
  import UserAvatar from './UserAvatar.vue';
  import { usePageContext } from '@renderer/usePageContext';
  const VALID_FILE_EXTS = ['.jpeg', '.png', '.gif', '.jpg'];

  // Props & Hooks
  const emit = defineEmits<{
    (e: 'set-unknown-error', error: boolean): void;
    (e: 'data-updated'): void;
  }>();
  const axios = useAxios();
  const pageContext = usePageContext();

  // Data & UI
  const editMode = ref(false);
  const firstName = ref('');
  const lastName = ref('');
  const firstErr = ref(false);
  const lastErr = ref(false);
  const isDirty = ref(false);
  const isLoading = ref(false);
  const fileToUploadName = ref('');

  // Intialize the form with the user's current name
  firstName.value = pageContext.user?.first_name ?? '';
  lastName.value = pageContext.user?.last_name ?? '';

  // Watch for changes to the form fields and set the dirty flag
  watch(
    () => [firstName.value, lastName.value, fileToUploadName.value],
    () => {
      if (isDirty.value) return; // Don't set dirty flag if already dirty
      isDirty.value = true;
    },
  );

  // Methods
  function handleOpenFileDialog(e: Event) {
    e.preventDefault();
    const el = document.getElementById('avatar-file-input');
    if (el) {
      el.click();
    }
  }

  function handleFileChange(e: Event) {
    e.preventDefault();
    const target = e.target as HTMLInputElement;
    if (target.files) {
      fileToUploadName.value = target.files[0].name;
    }
  }

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

  async function _uploadAvatar(): Promise<'success' | 'error'> {
    try {
      if (!pageContext.user || !pageContext.user.uuid) {
        throw new Error('badreq');
      }
      if (!fileToUploadName.value) {
        throw new Error('badreq');
      }

      const formData = new FormData();
      const fileInput = document.getElementById(
        'avatar-file-input',
      ) as HTMLInputElement;
      if (!fileInput.files) {
        throw new Error('badreq');
      }

      formData.append('avatarFile', fileInput.files[0]);

      const response = await axios.post(
        `/users/${pageContext.user.uuid}/avatar`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      if (!response.data) {
        throw new Error('badres');
      }
      return 'success';
    } catch (error) {
      console.error(error);
      return 'error';
    }
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

      if (
        !firstName.value ||
        !lastName.value ||
        !pageContext.user ||
        !pageContext.user.uuid
      ) {
        throw new Error('badreq');
      }

      isLoading.value = true;

      // Upload avatar if a file was selected
      if(fileToUploadName.value) {
        const avatarRes = await _uploadAvatar();
        if (avatarRes !== 'success') {
          throw new Error('badres');
        }
      }

      const response = await axios.patch(`/users/${pageContext.user.uuid}`, {
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
