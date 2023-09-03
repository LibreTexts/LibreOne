<template>
  <div
    aria-live="polite"
    :aria-busy="loading"
  >
    <h1 class="text-center text-3xl font-medium">
      {{ $t('complete_registration_name.header') }}
    </h1>
    <p class="text-center mt-4">
      {{ $t('complete_registration_name.tagline') }}
    </p>
    <form @submit="submitForm">
      <div class="my-6">
        <label
          for="first_input"
          class="block text-sm font-medium"
        >
          {{ $t('profile.firstname') }}
        </label>
        <input
          id="first_input"
          type="text"
          placeholder="Deanna"
          v-model="firstName"
          aria-required
          :class="['border', firstErr ? 'border-red-600' : 'border-gray-300', 'block', 'h-10', 'mt-2', 'w-full', 'rounded-md', 'px-2', 'placeholder:text-slate-400', 'placeholder:font-light']"
        >
      </div>
      <div class="my-6">
        <label
          for="last_input"
          class="block text-sm font-medium"
        >
          {{ $t('profile.lastname') }}
        </label>
        <input
          id="last_input"
          type="text"
          placeholder="Troi"
          v-model="lastName"
          aria-required
          :class="['border', lastErr ? 'border-red-600' : 'border-gray-300', 'block', 'h-10', 'mt-2', 'w-full', 'rounded-md', 'px-2', 'placeholder:text-slate-400', 'placeholder:font-light']"
        >
      </div>
      <button
        type="submit"
        class="inline-flex items-center justify-center h-10 bg-primary p-2 mt-2 rounded-md text-white w-full font-medium hover:bg-sky-700 hover:shadow"
      >
        <template v-if="!loading">
          <span>{{ $t('common.continue') }}</span>
          <FontAwesomeIcon
            icon="fa-solid fa-circle-arrow-right"
            class="ml-2"
          />
        </template>
        <template v-else>
          <LoadingIndicator />
          <span class="ml-2">{{ $t('common.updating') }}...</span>
        </template>
      </button>
      <p class="text-xs text-center text-gray-500 mt-4">
        {{ $t('complete_registration_name.updatelater') }}
      </p>
    </form>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { useAxios } from '@renderer/useAxios';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import LoadingIndicator from '@components/LoadingIndicator.vue';
  import { DEFAULT_FIRST_NAME, DEFAULT_LAST_NAME } from '@server/helpers';

  // Props && Hooks
  const props = defineProps<{
    uuid: string;
    firstName?: string;
    lastName?: string;
  }>();
  const emit = defineEmits<{
    (e: 'name-update', firstName: string, lastName: string): void;
  }>();
  const axios = useAxios();

  // Data && UI
  const loading = ref(false);
  const firstName = ref('');
  const lastName = ref('');
  const firstErr = ref(false);
  const lastErr = ref(false);

  // Lifecycle
  initName();

  // Methods

  /**
   * Initializes the name fields with the provided props. If props are defined and not the default set by the server.
   */
  function initName(){
    if(!props.firstName || !props.lastName) return;
    if(props.firstName === DEFAULT_FIRST_NAME || props.lastName === DEFAULT_LAST_NAME) return;
    firstName.value = props.firstName;
    lastName.value = props.lastName;
  }

  /**
   * Resets any active error states in the form.
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
    if (firstName.value.trim().length < 1 || firstName.value.trim().length > 100) {
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
   * Submits the data to the server if all form fields are valid, then emits
   * the `name-update` event.
   *
   * @param e - Form submission event.
   */
  async function submitForm(e: Event) {
    e.preventDefault();
    resetFormErrors();
    if (!validateForm()) {
      return;
    }
    loading.value = true;
    try {
      await axios.patch(`/users/${props.uuid}`, {
        first_name: firstName.value,
        last_name: lastName.value,
      });
      loading.value = false;
      emit('name-update', firstName.value, lastName.value);
    } catch (e) {
      loading.value = false;
    }
  }

</script>