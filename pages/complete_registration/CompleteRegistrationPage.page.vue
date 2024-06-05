<template>
  <div
    class="bg-zinc-100 grid grid-flow-col justify-items-center items-center min-h-screen py-10"
  >
    <div class="w-11/12 md:w-3/4">
      <img
        src="@renderer/libretexts_logo.png"
        alt="LibreTexts"
        class="max-w-xs my-0 mx-auto"
      >
      <div
        class="bg-white p-6 mt-6 shadow-md shadow-gray-400 rounded-md overflow-hidden min-h-[16em]"
      >
        <Transition
          mode="out-in"
          enter-from-class="motion-safe:translate-x-full"
          enter-to-class="motion-safe:translate-x-0"
          leave-from-class="motion-safe:translate-x-0"
          leave-to-class="motion-safe:-translate-x-full"
          enter-active-class="motion-safe:transition-transform motion-safe:ease-out motion-safe:duration-500"
          leave-active-class="motion-safe:transition-transform motion-safe:ease-in motion-safe:duration-300"
          @after-leave="completeNavigation"
        >
          <div
            :key="stage"
            v-if="formVisible"
          >
            <component
              :is="stage"
              v-bind="componentProps"
              v-on="componentEvents"
            />
          </div>
        </Transition>
        <p class = "text-center">
    You're currently logged in as {{pageContext.user.email}}
    </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, defineAsyncComponent, onMounted, ref } from 'vue';
  import { usePageContext } from '@renderer/usePageContext';
  import NameForm from '@components/complete_registration/NameForm.vue';
  const OrgForm = defineAsyncComponent(
    () => import('@components/complete_registration/OrgForm.vue'),
  );
  const RoleForm = defineAsyncComponent(
    () => import('@components/complete_registration/RoleForm.vue'),
  );
  const StudentIdForm = defineAsyncComponent(
    () => import('@components/complete_registration/StudentIdForm.vue'),
  );
  const TimezoneForm = defineAsyncComponent(
    () => import('@components/complete_registration/TimezoneForm.vue'),
  );

  const pageContext = usePageContext();

  const stage = computed(() => {
    const stageId = pageContext?.routeParams?.stageId;
    switch (stageId) {
      case 'organization': {
        return OrgForm;
      }
      case 'role': {
        return RoleForm;
      }
      case 'student-id': {
        return StudentIdForm;
      }
      case 'timezone': {
        return TimezoneForm;
      }
      case 'name':
      default:
        return NameForm;
    }
  });
  const formVisible = ref(false);
  const nextNavigationURL = ref<string | null>(null);
  const componentProps = computed(() => {
    switch (stage.value) {
      case NameForm: {
        return { uuid: pageContext.user?.uuid, firstName: pageContext.user?.first_name, lastName: pageContext.user?.last_name };
      }
      case OrgForm: {
        return { uuid: pageContext.user?.uuid };
      }
      case RoleForm: {
        return { uuid: pageContext.user?.uuid };
      }
      case StudentIdForm: {
        return { uuid: pageContext.user?.uuid };
      }
      case TimezoneForm: {
        return { uuid: pageContext.user?.uuid };
      }
      default: {
        return {};
      }
    }
  });
  const componentEvents = computed(() => {
    switch (stage.value) {
      case OrgForm: {
        return { 'org-update': handleOrgSelectionComplete };
      }
      case RoleForm: {
        return { 'role-update': handleRoleSelectionComplete };
      }
      case StudentIdForm: {
        return { 'student-id-update': handleStudentIdComplete };
      }
      default: {
        return { 'name-update': handleNameInputComplete };
      }
    }
  });

  onMounted(() => (formVisible.value = true));

  function handleNavigation(href: string) {
    nextNavigationURL.value = href;
    formVisible.value = false;
  }

  function completeNavigation() {
    if (nextNavigationURL.value) {
      window.location.href = nextNavigationURL.value;
    }
  }

  /**
   * Advances the page to the Role selection stage upon receiving the 'name-update' event.
   */
  function handleNameInputComplete() {
    handleNavigation('/complete-registration/role');
  }

  /**
   * Advances the page to the Organization selection state upon receiving the 'role-update' event.
   */
  function handleRoleSelectionComplete() {
    handleNavigation('/complete-registration/organization');
  }

  /**
   * Advances the page to the Timezone selection OR Student ID stage upon receiving the 'org-update' event.
   */
  function handleOrgSelectionComplete() {
    // If the user is an student, advance to the Student ID stage.
    if (pageContext?.user?.user_type === 'student') {
      handleNavigation('/complete-registration/student-id');
    }
    // Otherwise, advance to the Timezone stage.
    else {
      handleNavigation('/complete-registration/timezone');
    }
  }

  /**
   * Advances the page to the Timezone selection stage upon receiving the 'student-id-update' event.
   */
  function handleStudentIdComplete() {
    handleNavigation('/complete-registration/timezone');
  }
</script>
