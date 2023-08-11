<template>
  <div v-bind="$attrs">
    <div v-if="formStep === 1">
      <form @submit="submitNewEmail">
        <ThemedInput
          id="new_email_input"
          :label="$t('security.newemail')"
          aria-required="true"
          v-model="newEmail"
          :placeholder="$t('common.email_placeholder')"
          class="my-4"
        />
        <p
          class="text-center text-red-600 text-sm mt-2 font-bold"
          v-if="newEmailError"
        >
          {{ newEmailError }}
        </p>
        <ThemedButton
          @click="submitNewEmail"
          type="submit"
          :disabled="!isValidEmail(newEmail)"
          :loading="isLoading"
          class="mt-6"
          >{{ $t("common.submit") }}</ThemedButton
        >
      </form>
    </div>
    <div v-if="formStep === 2">
      <form @submit="submitVerifyCode">
        <p class="mt-4">{{ $t("security.verify_message") }}</p>
        <ThemedInput
          id="email_code_input"
          :label="$t('register.verify_code')"
          aria-required="true"
          v-model="verifyCode"
          placeholder="000000"
          class="my-4"
        />
        <p
          class="text-center text-red-600 text-sm mt-2 font-bold"
          v-if="verifyCodeError"
        >
          {{ verifyCodeError }}
        </p>
        <ThemedButton
          type="submit"
          @click="submitVerifyCode"
          :disabled="!isValidCode(verifyCode)"
          class="mt-6"
          :loading="isLoading"
          >{{ $t("common.submit") }}</ThemedButton
        >
      </form>
    </div>
    <Transition
      mode="out-in"
      enter-from-class="motion-safe:translate-x-full"
      enter-to-class="motion-safe:translate-x-0"
      leave-from-class="motion-safe:translate-x-0"
      leave-to-class="motion-safe:-translate-x-full"
      enter-active-class="motion-safe:transition-transform motion-safe:ease-out motion-safe:duration-300"
      leave-active-class="motion-safe:transition-transform motion-safe:ease-in motion-safe:duration-300"
      v-if="formStep === 3"
    >
      <div>
        <div class="flex flex-col text-center my-8">
          <p class="text-lg font-medium">
            {{ $t("security.newemailsuccess") }}
          </p>
          <p class="mt-4">{{ $t("security.redirecting") }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
import { useAxios } from "@renderer/useAxios";
import { ref } from "vue";
import ThemedInput from "../ThemedInput.vue";
import ThemedButton from "../ThemedButton.vue";
import { useI18n } from "vue-i18n";
import joi from "joi";
const props = defineProps<{
  user?: Record<string, string>;
}>();
const emit = defineEmits<{
  (e: "set-unknown-error", error: boolean): void;
  (e: "data-updated"): void;
}>();
const axios = useAxios();
const { t } = useI18n();

const formStep = ref(1);
const newEmail = ref("");
const newEmailError = ref("");
const verifyCode = ref("");
const verifyCodeError = ref("");
const isLoading = ref(false);

function isValidEmail(str: string): boolean {
  const schema = joi.string().email({ tlds: false }).required();
  const { error } = schema.validate(str);
  if (error) return false;
  return true;
}

function isValidCode(str: string): boolean {
  const schema = joi.string().length(6).required();
  const { error } = schema.validate(str);
  if (error) return false;
  return true;
}

const submitNewEmail = async (e: Event) => {
  try {
    e.preventDefault();
    newEmailError.value = "";
    if (!props.user || !props.user.uuid) return;
    if (!newEmail.value || !isValidEmail(newEmail.value)) {
      newEmailError.value = t("security.newemailinvalid");
      return;
    }

    isLoading.value = true;
    const res = await axios.post(`/users/${props.user.uuid}/email-change`, {
      email: newEmail.value,
    });

    if (res.status === 200 && res.data.data.uuid) {
      formStep.value = 2;
      return;
    }

    throw new Error("badres");
  } catch (err: any) {
    if (err.response.status === 400) {
      newEmailError.value = t("security.newemailexists");
      return;
    }
    newEmailError.value = t("security.newemailerror");
  } finally {
    isLoading.value = false;
  }
};

const submitVerifyCode = async (e: Event) => {
  try {
    e.preventDefault();
    verifyCodeError.value = "";
    if (!props.user || !props.user.uuid) return;

    // Email should already be validated, but double check that state was not lost
    if (!newEmail.value || !isValidEmail(newEmail.value)) {
      newEmailError.value = t("security.newemailinvalid");
      return;
    }
    if (!verifyCode.value || !isValidCode(verifyCode.value)) {
      verifyCodeError.value = t("security.verifyinvalid");
      return;
    }

    isLoading.value = true;
    const res = await axios.post(
      `/users/${props.user.uuid}/verify-email-change`,
      {
        email: newEmail.value,
        code: verifyCode.value,
      }
    );

    if (res.status === 200 && res.data.data.uuid) {
      handleSuccess();
      return;
    }
    throw new Error("badres");
  } catch (err: any) {
    if (err.response.status === 400) {
      verifyCodeError.value = t("security.verifyinvalid");
      return;
    }
    emit("set-unknown-error", true);
  } finally {
    isLoading.value = false;
  }
};

function handleSuccess() {
  formStep.value = 3;
  setTimeout(() => {
    emit("data-updated");
  }, 2000);
}
</script>
