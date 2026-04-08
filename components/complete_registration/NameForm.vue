<template>
  <div
    aria-live="polite"
    :aria-busy="loading"
  >
    <Heading :level="3" class="text-center">
      {{ $t('complete_registration_name.header') }}
    </Heading>
    <p class="text-center mt-4">
      {{ $t('complete_registration_name.tagline') }}
    </p>
    <form @submit="submitForm">
      <Input
        name="first_input"
        :label="$t('profile.firstname')"
        placeholder="Benny"
        v-model="firstName"
        :error="firstErr"
        required
        class="my-6"
      />
      <Input
        name="last_input"
        :label="$t('profile.lastname')"
        placeholder="Owl"
        v-model="lastName"
        :error="lastErr"
        required
        class="my-6"
      />
      <Button
        type="submit"
        full-width
        :loading="loading"
        class="mt-2"
      >
        {{ $t('common.continue') }}
      </Button>
      <p class="text-xs text-center text-gray-500 mt-4">
        {{ $t('complete_registration_name.updatelater') }}
      </p>
    </form>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { useAxios } from '@renderer/useAxios';
  import { Heading, Input, Button } from '@libretexts/davis-vue';
  import { DEFAULT_FIRST_NAME, DEFAULT_LAST_NAME } from '@server/helpers';

  const props = defineProps<{
    uuid: string;
    firstName?: string;
    lastName?: string;
  }>();
  const emit = defineEmits<{
    (e: 'name-update', firstName: string, lastName: string): void;
  }>();
  const axios = useAxios();

  const loading = ref(false);
  const firstName = ref('');
  const lastName = ref('');
  const firstErr = ref(false);
  const lastErr = ref(false);

  initName();

  function initName() {
    if (!props.firstName || !props.lastName) return;
    if (props.firstName === DEFAULT_FIRST_NAME || props.lastName === DEFAULT_LAST_NAME) return;
    firstName.value = props.firstName;
    lastName.value = props.lastName;
  }

  function resetFormErrors() {
    firstErr.value = false;
    lastErr.value = false;
  }

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

  async function submitForm(e: Event) {
    e.preventDefault();
    resetFormErrors();
    if (!validateForm()) return;
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
