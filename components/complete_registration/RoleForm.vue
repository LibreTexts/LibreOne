<template>
  <div
    aria-live="polite"
    :aria-busy="loading"
  >
    <h1 class="text-center text-3xl font-medium">
      {{ $t('complete_registration_role.header', { name: pageContext?.user?.first_name }) }}
    </h1>
    <p class="text-center mt-4">
      {{ $t('complete_registration_role.tagline') }}
    </p>
    <p class="text-center mt-1 text-sm text-gray-500">
      {{ $t('complete_registration_role.changelater') }}
    </p>
    <template v-if="!loading">
      <div class="mt-8">
        <button
          class="inline-flex items-center justify-center h-10 bg-primary p-2 rounded-md text-white w-full font-medium hover:bg-sky-700 hover:shadow"
          @click="handleStudentClick"
        >
          {{ $t('complete_registration_role.student_user') }}
        </button>
        <button
          class="inline-flex items-center justify-center h-10 bg-primary p-2 mt-4 rounded-md text-white w-full font-medium hover:bg-sky-700 hover:shadow"
          @click="handleInstructorClick"
        >
          {{ $t('complete_registration_role.instructor_user') }}
        </button>
      </div>
      <p class="text-center text-gray-500 text-xs mt-3 mx-3">
        <FontAwesomeIcon icon="fa-solid fa-circle-info" />
        {{ $t('complete_registration_role.instructor_info') }}
      </p>
    </template>
    <div
      v-else
      class="flex items-center justify-center p-8"
    >
      <LoadingIndicator class="!h-8 !w-8" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from 'vue';
  import { useAxios } from '@renderer/useAxios';
  import { usePageContext } from '@renderer/usePageContext';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import LoadingIndicator from '@components/LoadingIndicator.vue';

  const props = defineProps<{ uuid: string }>();
  const emit = defineEmits<{
    (e: 'role-update', role: string): void;
  }>();
  const pageContext = usePageContext();
  const axios = useAxios();

  const loading = ref(false);

  /**
   * Triggers submission of the 'student' role to the server.
   */
  function handleStudentClick() {
    submitRoleUpdate('student');
  }

  /**
   * Triggers submission of the 'instructor' role to the server.
   */
  function handleInstructorClick() {
    submitRoleUpdate('instructor');
  }

  /**
   * Submits the role to the server, then emits the 'role-update' event.
   *
   * @param role - Role identifier to submit.
   */
  async function submitRoleUpdate(role: string) {
    loading.value = true;
    try {
      await axios.patch(`/users/${props.uuid}`, {
        user_type: role,
      });
      loading.value = false;
      emit('role-update', role);
    } catch (e) {
      loading.value = false;
    }
  }

</script>