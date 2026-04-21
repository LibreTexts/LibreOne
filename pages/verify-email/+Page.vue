<template>
  <div
    class="bg-zinc-100 grid grid-flow-col justify-items-center items-center min-h-screen py-10"
  >
    <div class="w-11/12 md:w-3/4">
      <img
        src="@renderer/libretexts_logo.png"
        alt="LibreTexts"
        class="max-w-xs my-0 mx-auto"
      />
      <div
        class="bg-white p-6 mt-6 shadow-md shadow-gray-400 rounded-md overflow-hidden"
      >
        <div aria-live="polite" :aria-busy="loading">
          <!-- Loading State -->
          <template v-if="loading">
            <h1 class="text-center text-3xl font-medium">
              {{ $t("email_verification.header") }}
            </h1>
            <div class="flex items-center justify-center mt-6">
              <LoadingIndicator />
              <span class="ml-2">{{ $t("email_verification.loading") }}</span>
            </div>
            <p class="text-xs text-center text-gray-500 mt-4">
              {{ $t("email_verification.verify_thanks") }}
            </p>
          </template>

          <!-- Success State -->
          <template v-else-if="success">
            <h1 class="text-center text-3xl font-medium">
              {{ $t("email_verification.success_header") }}
            </h1>
            <p class="text-center text-gray-700 mt-4">
              {{ $t("email_verification.success_tagline") }}
            </p>
            <a
              href="/signin"
              class="inline-flex items-center justify-center h-10 bg-primary p-2 mt-6 rounded-md text-white w-full font-medium hover:bg-sky-700 hover:shadow"
            >
              <span>{{ $t("email_verification.continue_to_signin") }}</span>
              <FontAwesomeIcon
                icon="fa-solid fa-circle-arrow-right"
                class="ml-2"
              />
            </a>
          </template>

          <!-- Invalid/Expired Token State -->
          <template v-else>
            <h1 class="text-center text-3xl font-medium">
              {{ $t("email_verification.error_header") }}
            </h1>
            <p class="text-center text-gray-700 mt-4" v-if="showResendOption">
              {{ $t("email_verification.error_expired") }}
            </p>
            <p class="text-center text-gray-700 mt-4" v-else>
              {{ $t("email_verification.error_invalid") }}
            </p>
            <p class="text-center text-gray-700 mt-4" v-if="didResend">
              {{ $t("email_verification.resend_success") }}
            </p>
            <ThemedButton
              v-if="showResendOption && !didResend"
              icon="IconCircleArrowRight"
              @click="resendVerificationEmail"
              class="mt-6 w-full justify-center"
            >
              {{ $t("email_verification.resend_verification") }}
            </ThemedButton>
          </template>

          <!-- Error Message -->
          <p
            class="text-center text-red-600 text-sm mt-4 font-bold"
            v-if="error"
          >
            {{ error }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { useAxios } from "@renderer/useAxios";
import { usePageProps } from "@renderer/usePageProps";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import LoadingIndicator from "@components/LoadingIndicator.vue";
import ThemedButton from "../../components/ThemedButton.vue";

const props = usePageProps<{
  token: string;
}>();
const axios = useAxios();

const success = ref(false);
const loading = ref(true);
const error = ref<string | null>(null);
const resendUUID = ref<string | null>(null);
const showResendOption = ref(false);
const didResend = ref(false);

async function submitToken() {
  try {
    loading.value = true;

    const result = await axios.post("/auth/verify-email-token", {
      token: props.token,
    });

    success.value = result.data.success === true;
    resendUUID.value = result.data.data?.uuid || null;

    // Can only resend if the token expired so we got the UUID back
    // If it was an invalid token, we won't get a UUID
    if (!success.value && resendUUID.value) {
      showResendOption.value = true;
    }
  } catch (e: any) {
    console.error(e);
    success.value = false;
    if (e?.code !== "ERR_BAD_REQUEST") {
      error.value = "An error occurred while verifying your email.";
    }
  } finally {
    loading.value = false;
  }
}

async function resendVerificationEmail() {
  try {
    if (!resendUUID.value) return;

    loading.value = true;

    await axios.post("/auth/resend-verification-email", {
      uuid: resendUUID.value,
    });

    didResend.value = true;
  } catch (e) {
    console.error("Failed to resend verification email:", e);
    error.value =
      "An error occurred while resending the verification email. Please contact our Support Center.";
  } finally {
    loading.value = false;
  }
}

// Automatically submit token when component mounts
onMounted(() => {
  if (props.token) {
    submitToken();
  } else {
    // No token provided, show error state
    loading.value = false;
    success.value = false;
  }
});
</script>
