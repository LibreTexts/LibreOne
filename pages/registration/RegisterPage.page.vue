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
          <component
            :is="stage"
            v-bind="componentProps"
            v-on="componentEvents"
          />
          
        </Transition>
        <p class = "text-center">
    You're currently logged in as {{email }}
    </p>
      </div>
    </div>
 
  </div>
</template>

<script lang="ts" setup>
  import { computed, defineAsyncComponent, ref, shallowRef } from 'vue';
  import AuthForm from '@components/registration/AuthForm.vue';
  const VerifyEmail = defineAsyncComponent(() => import('@components/registration/VerifyEmail.vue'));
  
 

  const props = defineProps<{
    loginURL: string;
    recoveryURL: string;
    googleRegisterURL: string;
    microsoftRegisterURL: string;
  }>();

  const stage = shallowRef(AuthForm);
  const email = ref('');

  const componentProps = computed(() => {
    switch (stage.value) {
      case VerifyEmail: {
        return { email: email.value };
      }
      default: {
        return { ...props };
      }
    }
  });
  const componentEvents = computed(() => {
    switch (stage.value) {
      case VerifyEmail: {
        return { };
      }
      default: {
        return { register: handleInitialRegistrationComplete };
      }
    }
  });

  /**
   * Advances the page to the Verify Email stage upon receiving the 'register' event.
   *
   * @param resEmail - The user's email passed with the event.
   */
  function handleInitialRegistrationComplete(resEmail: string) {
    email.value = resEmail;
    stage.value = VerifyEmail;
  }

</script>