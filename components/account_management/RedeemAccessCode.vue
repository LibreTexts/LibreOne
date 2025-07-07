<template>
    <div v-bind="$attrs" class="flex flex-col items-center justify-center w-full">
        <h1 class="text-3xl font-medium text-center">Redeem Access Code</h1>
        <template v-if="!redeemSuccess">
            <p class="text-center text-slate-500">
                Purchased an access code? Redeem it here to activate your subscription.
            </p>

            <ThemedInput v-model="accessCode" placeholder="Enter your access code (e.g. ABCD-1234-EFGH-5678)"
                class="w-full mt-6 mb-4" @keyup.enter="redeemCode" />

            <ThemedButton @click="redeemCode" variant="default" class="w-full py-3 text-center" icon="IconKeyFilled"
                :disabled="!accessCode" :loading="isLoading">
                Redeem Code
            </ThemedButton>
            <p v-if="redeemError" class="text-red-500 mt-4">{{ redeemError }}</p>
        </template>
        <div v-else class="flex flex-col items-center justify-center w-full">
            <p class="text-green-600 font-semibold text-center mt-4">
                Access code redeemed successfully! Your subscription is now active.
            </p>
            <a href="/home" class="w-full mt-4">
                <ThemedButton variant="default" class="w-full py-3 text-center">
                    Go to Launchpad
                </ThemedButton>
            </a>
            <ThemedButton variant="outlined" class="w-full py-3 text-center mt-2" @click="redeemAnother">
                Redeem Another Code
            </ThemedButton>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, defineProps } from "vue";
import { useAxios } from "@renderer/useAxios";
import { usePageContext } from "@renderer/usePageContext";
import ThemedButton from "../ThemedButton.vue";
import ThemedInput from "../ThemedInput.vue";

const props = defineProps<{
    access_code?: string;
}>();

const axios = useAxios();
const pageContext = usePageContext().value;

const isLoading = ref(false);
const accessCode = ref(props.access_code || "");
const redeemError = ref<string | null>(null);
const redeemSuccess = ref(false);

// navigate to /redeem and force a refresh
function redeemAnother() {
    window.history.pushState({}, "", "/redeem");
    window.location.reload();
}

async function redeemCode() {
    try {
        if (!pageContext.user) {
            redeemError.value = "You must be logged in to redeem an access code.";
            return;
        }

        isLoading.value = true;
        redeemError.value = null;
        redeemSuccess.value = false;

        const response = await axios.post(`/app-licenses/redeem/${pageContext.user?.uuid}`, {
            access_code: accessCode.value,
        });

        if (!response.data.success) {
            throw new Error(response.data.message || "Failed to redeem access code");
        }

        redeemSuccess.value = true;
        redeemError.value = null;
        accessCode.value = ""; // Clear the input after successful redemption
    } catch (error) {
        console.error("Error redeeming access code:", error);
        redeemError.value = "Failed to redeem access code. Please try again.";
    } finally {
        isLoading.value = false;
    }
}

</script>
