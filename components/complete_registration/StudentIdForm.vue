<template>
  <h1 class="text-center text-3xl font-medium">
    {{ $t("complete_registration_student.header") }}
  </h1>
  <p class="text-center mt-4">
    {{ $t("complete_registration_student.tagline") }}
  </p>
  <p class="text-center mt-1 mb-4 text-sm text-gray-500">
    {{ $t("complete_registration_student.tagline_note") }}
  </p>
  <template v-if="!loading">
    <div class="lg:my-4">
      <div>
        <ThemedInput
          id="student_id_input"
          :label="$t('complete_registration_student.student_id')"
          aria-required="true"
          v-model="studentId"
          placeholder="000000000"
          class="my-4"
        />
      </div>
    </div>
    <ThemedButton
      type="submit"
      @click="handleSubmit"
      :disabled="studentId.length < 3 || studentId.length > 50"
      class="mt-6"
      :loading="loading"
    >
      {{ $t("common.submit") }}
    </ThemedButton>
  </template>
  <div
    v-else
    class="flex items-center justify-center p-8"
  >
    <LoadingIndicator class="!h-8 !w-8" />
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue';
  import { useAxios } from '@renderer/useAxios';
  import LoadingIndicator from '@components/LoadingIndicator.vue';
  import ThemedInput from '../ThemedInput.vue';
  import ThemedButton from '../ThemedButton.vue';

  // Local Types
  type StudentIdPatch = {
    student_id: string;
  };

  // Props & Hooks
  const emit = defineEmits<{
    (e: 'student-id-update'): void;
  }>();
  const props = defineProps<{
    uuid: string;
  }>();
  const axios = useAxios();

  // UI & Data
  const loading = ref(false);
  const studentId = ref('');

  // Methods

  /**
   * Validates the student ID input and requests a student ID update.
   */
  function handleSubmit() {
    // Arbitrary length limits to prevent abuse.
    if (studentId.value.length > 1 && studentId.value.length < 255) {
      submitStudentId({ student_id: studentId.value.toString() });
    }
  }

  /**
   * Submits the student ID update to the server.
   *
   * @param {StudentIdPatch} data - Student ID information to submit.
   */
  async function submitStudentId(data: StudentIdPatch) {
    try {
      loading.value = true;
      await axios.patch(`/users/${props.uuid}`, data);
      loading.value = false;
      emit('student-id-update');
    } catch (e) {
      loading.value = false;
    } finally {
      loading.value = false;
    }
  }
</script>
