<template>
  <div class="bg-zinc-100 grid grid-flow-col justify-items-center items-center min-h-screen py-10">
    <div class="w-11/12 md:w-3/4">
      <img
        src="@renderer/libretexts_logo.png"
        alt="LibreTexts"
        class="max-w-xs my-0 mx-auto"
      >
      <div class="bg-white p-6 mt-6 shadow-md shadow-gray-400 rounded-md overflow-hidden">
        <Transition
          mode="out-in"
          enter-from-class="motion-safe:translate-x-full"
          enter-to-class="motion-safe:translate-x-0"
          leave-from-class="motion-safe:translate-x-0"
          leave-to-class="motion-safe:-translate-x-full"
          enter-active-class="motion-safe:transition-transform motion-safe:ease-out motion-safe:duration-500"
          leave-active-class="motion-safe:transition-transform motion-safe:ease-in motion-safe:duration-300"
        >
          <div :key="stage">
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
  import { computed, defineAsyncComponent, ref, shallowRef } from 'vue';
  import { usePageContext } from '@renderer/usePageContext';
  import NameForm from '@components/complete_registration/NameForm.vue';
  const OrgForm = defineAsyncComponent(() => import('@components/complete_registration/OrgForm.vue'));
  const RoleForm = defineAsyncComponent(() => import('@components/complete_registration/RoleForm.vue'));

  const pageContext = usePageContext();

  const stage = shallowRef(NameForm);
  const firstName = ref('');

  const componentProps = computed(() => {
    switch (stage.value) {
      case NameForm: {
        return { uuid: pageContext.user?.uuid };
      }
      case OrgForm: {
        return { uuid: pageContext.user?.uuid };
      }
      case RoleForm: {
        return { uuid: pageContext.user?.uuid, firstName: firstName.value };
      }
      default: {
        return { };
      }
    }
  });
  const componentEvents = computed(() => {
    switch (stage.value) {
      case OrgForm: {
        return { };
      }
      case RoleForm: {
        return { 'role-update': handleRoleSelectionComplete };
      }
      default: {
        return { 'name-update': handleNameInputComplete  };
      }
    }
  });

  /**
   * Advances the page to the Role selection stage upon receiving the 'name-update' event.
   *
   * @param resFirstName - The user's first name passed with the event.
   */
  function handleNameInputComplete(resFirstName: string) {
    firstName.value = resFirstName;
    stage.value = RoleForm;
  }

  /**
   * Advances the page to the Organization selection state upon receiving the 'role-update' event.
   *
   * @param resRole - The user's role selection passed with the event.
   */
  function handleRoleSelectionComplete(resRole: string) {
    stage.value = OrgForm;
    console.log(resRole);
  }

</script>