<template>
    <div v-bind="$attrs">
        <div class="flex flex-col gap-y-2 w-full">
            <h1 class="text-3xl font-medium text-center">Redeem Access Code</h1>
            <p class="text-center text-slate-500">
                Purchased an access code? Redeem it here to activate your subscription.
            </p>
        </div>

        <ThemedInput v-model="accessCode" placeholder="Enter your access code (e.g. ABCD-1234-EFGH-5678)"
            class="w-full my-6" @keyup.enter="redeemCode" />

        <ThemedButton @click="redeemCode" variant="default" class="w-full py-3 text-center" icon="IconKeyFilled"
            :disabled="!accessCode">
            Redeem Code
        </ThemedButton>
    </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useAxios } from "@renderer/useAxios";
import { usePageContext } from "@renderer/usePageContext";
import ThemedButton from "../ThemedButton.vue";
import ThemedInput from "../ThemedInput.vue";

const axios = useAxios();
const pageContext = usePageContext().value;

const isLoading = ref(false);
const accessCode = ref("");
const redeemError = ref<string | null>(null);

async function redeemCode() {
    try {
        isLoading.value = true;
        const response = await axios.post("/api/v1/redeem", {
            code: accessCode.value,
        });
        console.log("Redeem response:", response.data);
    } catch (error) {
        console.error("Error redeeming access code:", error);
        redeemError.value = "Failed to redeem access code. Please try again.";
    } finally {
        isLoading.value = false;
    }
}

</script>
