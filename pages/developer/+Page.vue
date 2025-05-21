<template>
  <StandardPageLayout>
    <div aria-live="polite">
      <!--Content Header-->
      <div class="flex justify-between">
        <div class="flex flex-col">
          <p class="text-3xl font-medium">Developer Center</p>
          <p class="mt-2 text-slate-500">
            Find tools and resources to integrate with LibreOne.
          </p>
        </div>
      </div>
      <div class="flex flex-col mt-4 border-t border-slate-200 pt-8">
        <div class="rounded-md bg-green-100 py-4 px-1 mb-2" v-if="sendSuccess">
          <div class="flex">
            <div class="shrink-0">
              <ExclamationTriangleIcon
                aria-hidden="true"
                class="size-5 text-yellow-400"
              />
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-black-800">
                Test Event Sent Successfully
              </h3>
              <div class="mt-2 text-sm text-black-700">
                <p>
                  A test event has been sent to your webhook URL. Check your
                  logs for the event data.
                </p>
              </div>
            </div>
          </div>
        </div>
        <p class="text-xl text-slate-800 font-semibold">
          Webhooks - Send a Test Event
        </p>
        <p class="mt-2 text-slate-500 text-sm">
          Select a webhook event type and send a test event to your webhook URL.
          Webhook data is sent as a JWT signed with the secret key you provide.
          The JWT will be sent as both a Bearer token in the Authorization
          header and as the "payload" key in the JSON request body. You can use
          either method to verify and extract the data from the JWT.
        </p>
        <p class="mt-2 text-slate-500 text-sm">
          Event requests are automatically retried 3 times before failing.
          Ensure that your logic is idempotent where necessary to avoid issues
          with duplicate events. Your webhook URL must be publicly accessible
          and able to receive HTTP POST requests. Note: This is for testing only
          - configuration here will not be saved.
        </p>
        <ThemedSelectInput
          id="webhook_event_type_input"
          label="Webhook Event Type"
          instructions="Select the type of event you want to test."
          v-model:value="webhookEventType"
          :options="
            EVENT_SUBSCRIBER_EVENTS.map((e) => ({
              label: e,
              value: e,
            }))
          "
          class="mb-2 mt-4"
          placeholder="Select an event type"
        />
        <ThemedInput
          id="webhook_url_input"
          label="Webhook URL"
          instructions="Enter the URL where you want to receive the test event."
          v-model="webhookUrl"
          placeholder="Enter your webhook URL"
          class="my-2"
        />
        <ThemedInput
          id="webhook_secret_key_input"
          label="Webhook Secret Key"
          instructions="Enter the secret key you want to test with."
          v-model="webhookSecretKey"
          placeholder="Enter your webhook secret key"
          class="my-2"
        />
        <p
          class="text-center text-red-600 text-sm mt-2 font-bold"
          v-if="requestError"
        >
          {{ requestError }}
        </p>
        <ThemedButton
          @click="sendTestEvent"
          type="submit"
          class="mt-6"
          variant="default"
          :loading="isLoading"
          :disabled="sendWebhookDisabled"
        >
          Send Test Event
        </ThemedButton>
      </div>
    </div>
  </StandardPageLayout>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue";
import StandardPageLayout from "../../components/layout/StandardPageLayout.vue";
import ThemedInput from "../../components/ThemedInput.vue";
import ThemedSelectInput from "../../components/ThemedSelectInput.vue";
import { EVENT_SUBSCRIBER_EVENTS } from "@server/controllers/EventSubscriberController";
import ThemedButton from "../../components/ThemedButton.vue";
import axios from "axios";

const webhookEventType = ref("user:created");
const webhookSecretKey = ref("");
const webhookUrl = ref("");
const isLoading = ref(false);
const requestError = ref("");
const sendSuccess = ref(false);

const sendWebhookDisabled = computed(() => {
  return (
    webhookEventType.value === "" ||
    webhookSecretKey.value === "" ||
    webhookUrl.value === ""
  );
});

watch(sendSuccess, (newValue) => {
  if (newValue) {
    setTimeout(() => {
      sendSuccess.value = false;
    }, 8000); // Hide success message after 8 seconds
  }
});

async function sendTestEvent() {
  try {
    if (sendWebhookDisabled.value) return;
    isLoading.value = true;
    requestError.value = ""; // Reset error message

    const response = await axios.post(
      "/api/v1/event-subscribers/send-test-event",
      {
        event: webhookEventType.value,
        secret_key: webhookSecretKey.value,
        url: webhookUrl.value,
      }
    );

    if (response.status === 200) {
      sendSuccess.value = true;
      requestError.value = ""; // Reset error message
    } else {
      requestError.value = "Failed to send test event. Please try again.";
    }
  } catch (error) {
    console.error("Error sending test event:", error);
    requestError.value = "Failed to send test event. Please try again.";
  } finally {
    isLoading.value = false;
  }
}
</script>
<style lang="css" scoped></style>
