<template>
  <div v-bind="$attrs">
    <form
      @submit="submitPasswordChange"
      v-if="formStep === 1"
    >
      <div class="flex items-center w-full mt-4">
        <ThemedInput
          id="current_password_input"
          :label="$t('security.currentpassword')"
          aria-required="true"
          v-model="currentPassword"
          :placeholder="$t('security.currentpassword')"
          class="w-full"
          :type="showCurrPassword ? 'text' : 'password'"
        />
        <button
          type="button"
          class="items-center justify-center mt-6 ml-2"
        >
          <FontAwesomeIcon
            @click="showCurrPassword = !showCurrPassword"
            :icon="['fa-solid', showCurrPassword ? 'fa-eye-slash' : 'fa-eye']"
          />
          <span class="sr-only">
            {{ showCurrPassword ? $t("common.hide") : $t("common.show") }}
            {{ $t("common.password") }}
          </span>
        </button>
      </div>

      <div class="flex items-center w-full mt-12">
        <ThemedInput
          id="new_password_input"
          :label="$t('security.newpassword')"
          :type="showNewPassword ? 'text' : 'password'"
          aria-required="true"
          v-model="newPassword"
          :placeholder="$t('security.newpassword')"
          class="w-full"
        />
        <button
          type="button"
          class="items-center justify-center mt-6 ml-2"
        >
          <FontAwesomeIcon
            @click="showNewPassword = !showNewPassword"
            :icon="['fa-solid', showNewPassword ? 'fa-eye-slash' : 'fa-eye']"
          />
          <span class="sr-only">
            {{ showNewPassword ? $t("common.hide") : $t("common.show") }}
            {{ $t("common.password") }}
          </span>
        </button>
      </div>

      <PasswordStrengthMeter
        :strength="passStrength"
        class="mt-2"
      />

      <div class="flex items-center w-full mt-6">
        <ThemedInput
          id="confirm_new_password_input"
          :label="$t('security.confirmnewpassword')"
          :type="showNewPassword ? 'text' : 'password'"
          aria-required="true"
          v-model="newPasswordConfirm"
          :placeholder="$t('security.confirmnewpassword')"
          class="w-full"
        />
        <button
          type="button"
          class="items-center justify-center mt-6 ml-2"
        >
          <FontAwesomeIcon
            @click="showNewPassword = !showNewPassword"
            :icon="['fa-solid', showNewPassword ? 'fa-eye-slash' : 'fa-eye']"
          />
          <span class="sr-only">
            {{ showNewPassword ? $t("common.hide") : $t("common.show") }}
            {{ $t("common.password") }}
          </span>
        </button>
      </div>
      <p
        class="text-center text-red-600 text-sm mt-2 font-bold"
        v-if="noMatchError"
      >
        {{ $t("security.nomatch") }}
      </p>
      <p
        class="text-center text-red-600 text-sm mt-4 font-bold"
        v-if="errorMsg"
      >
        {{ errorMsg }}
      </p>
      <ThemedButton
        type="submit"
        :disabled="noMatchError || !currentPassword || passStrength < 3"
        :loading="isLoading"
        class="mt-6"
        @click="submitPasswordChange"
      >
        {{ $t("common.submit") }}
      </ThemedButton>
    </form>
    <Transition
      mode="out-in"
      enter-from-class="motion-safe:translate-x-full"
      enter-to-class="motion-safe:translate-x-0"
      leave-from-class="motion-safe:translate-x-0"
      leave-to-class="motion-safe:-translate-x-full"
      enter-active-class="motion-safe:transition-transform motion-safe:ease-out motion-safe:duration-300"
      leave-active-class="motion-safe:transition-transform motion-safe:ease-in motion-safe:duration-300"
      v-else
    >
      <div>
        <div class="flex flex-col text-center my-8">
          <p class="text-lg font-medium">
            {{ $t("security.passwordchanged") }}
          </p>
          <p class="mt-4">
            {{ $t("security.redirecting") }}
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
  import { useAxios } from '@renderer/useAxios';
  import { ref, watch, computed } from 'vue';
  import ThemedInput from '../ThemedInput.vue';
  import ThemedButton from '../ThemedButton.vue';
  import PasswordStrengthMeter from '../PasswordStrengthMeter.vue';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { getPasswordStrength } from '@renderer/utils/auth';
  import { useI18n } from 'vue-i18n';

  const props = defineProps<{
    user?: Record<string, string>;
  }>();

  const emit = defineEmits<{
    (e: 'set-unknown-error', error: boolean): void;
    (e: 'password-changed'): void;
  }>();

  const axios = useAxios();
  const { t } = useI18n();

  const formStep = ref(1);
  const currentPassword = ref('');
  const newPassword = ref('');
  const newPasswordConfirm = ref('');
  const noMatchError = ref(false);
  const errorMsg = ref('');
  const showCurrPassword = ref(false);
  const showNewPassword = ref(false);
  const isLoading = ref(false);
  const passStrength = computed(() => getPasswordStrength(newPassword.value));

  watch(
    () => [newPassword.value, newPasswordConfirm.value],
    () => {
      if (newPassword.value !== newPasswordConfirm.value) {
        return (noMatchError.value = true);
      }
      return (noMatchError.value = false);
    },
  );

  const validateForm = (): boolean => {
    if (
      !currentPassword.value ||
      !newPassword.value ||
      !newPasswordConfirm.value
    ) {
      return false;
    }
    if (newPassword.value !== newPasswordConfirm.value) {
      noMatchError.value = true;
      return false;
    }
    if (currentPassword.value === newPassword.value) {
      errorMsg.value = t('security.cannotbecurrent');
      return false;
    }
    if (passStrength.value < 3) {
      errorMsg.value = t('security.notstrongenough');
      return false;
    }
    return true;
  };

  const submitPasswordChange = async (e: Event) => {
    try {
      e.preventDefault();

      errorMsg.value = '';
      if (!validateForm()) return;
      if (!props.user || !props.user.uuid) return;
      isLoading.value = true;

      const updateRes = await axios.post(
        `/users/${props.user.uuid}/password-change`,
        {
          old_password: currentPassword.value,
          new_password: newPassword.value,
        },
      );

      if (updateRes.status === 200 && updateRes.data.data.uuid) {
        handleSuccess();
        return;
      }

      throw new Error('badres');
    } catch (err) {
      errorMsg.value = t('security.passwordupdatefailed');
      currentPassword.value = '';
    } finally {
      isLoading.value = false;
    }
  };

  function handleSuccess() {
    formStep.value = 2;
    setTimeout(() => {
      emit('password-changed');
    }, 2000);
  }
</script>
