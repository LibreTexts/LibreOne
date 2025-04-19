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
      
      <p class="text-center lg:text-right text-sm text-slate-600 mb-4 lg:mb-2">
          {{ $t("register.logged_in_as") }} <span class="font-semibold">{{pageContext?.user?.email}}</span>
        </p>
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
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { computed, defineAsyncComponent, onMounted, ref } from 'vue';
  import { usePageContext } from '@renderer/usePageContext';
  import NameForm from '@components/complete_registration/NameForm.vue';
  import LanguageForm from '@components/complete_registration/LanguageForm.vue';
  import createPathWithLocale from '@locales/createPathWithLocale';
  const OrgForm = defineAsyncComponent(
    () => import('@components/complete_registration/OrgForm.vue'),
  );
  const RoleForm = defineAsyncComponent(
    () => import('@components/complete_registration/RoleForm.vue'),
  );
  const TimezoneForm = defineAsyncComponent(
    () => import('@components/complete_registration/TimezoneForm.vue'),
  );

  const pageContext = usePageContext().value;

  const stage = computed(() => {
    const stageId = pageContext.routeParams?.stageId;
    switch (stageId) {
      case 'language': {
        return LanguageForm;
      }
      case 'organization': {
        return OrgForm;
      }
      case 'role': {
        return RoleForm;
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
      case LanguageForm: {
        return { uuid: pageContext.user?.uuid, firstName: pageContext.user?.first_name };
      }
      case NameForm: {
        return { uuid: pageContext.user?.uuid, firstName: pageContext.user?.first_name, lastName: pageContext.user?.last_name };
      }
      case OrgForm: {
        return { uuid: pageContext.user?.uuid };
      }
      case RoleForm: {
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
      case LanguageForm: {
        return { 'language-update': handleLanguageSelectionComplete };
      }
      case OrgForm: {
        return { 'org-update': handleOrgSelectionComplete };
      }
      case RoleForm: {
        return { 'role-update': handleRoleSelectionComplete };
      }
      default: {
        return { 'name-update': handleNameInputComplete };
      }
    }
  });

  onMounted(() => (formVisible.value = true));

  function handleNavigation(href: string, newParams?: Record<string, string>) {
    const newPath = createPathWithLocale(href, pageContext);
    const queryParams = new URLSearchParams(window.location.search);
    if (newParams) {
      for (const [key, value] of Object.entries(newParams)) {
        queryParams.set(key, value);
      }
    }
    const queryString = queryParams.toString();
    nextNavigationURL.value = newPath + (queryString ? `?${queryString}` : ''); // carry over any query params
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
    handleNavigation('/complete-registration/language');
  }

  /**
   * Advances the page to the Organization selection state upon receiving the 'role-update' event.
   */
  function handleRoleSelectionComplete(role: string, adapt_role?: string) {
    handleNavigation('/complete-registration/organization', adapt_role ? { adapt_role } : undefined);
  }

  /**
   * Advances the page to the Timezone selection stage upon receiving the 'org-update' event.
   */
  function handleOrgSelectionComplete() {
    handleNavigation('/complete-registration/timezone');
  }

   /**
   * Advances the page to the Name input stage upon receiving the 'language-update' event.
   */
   function handleLanguageSelectionComplete() {
    handleNavigation('/complete-registration/role');
  }

  /**
   * Advances the page to the Timezone selection stage upon receiving the 'student-id-update' event.
   */
  function handleStudentIdComplete() {
    handleNavigation('/complete-registration/timezone');
  }
</script>
