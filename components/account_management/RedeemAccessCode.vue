<template>
    <div v-bind="$attrs" class="flex flex-col items-center justify-center w-full">
        <h1 class="text-3xl font-medium text-center">{{ t('redeem.title') }}</h1>
        <template v-if="!redeemSuccess">
            <p class="text-center text-slate-500">
                {{ t('redeem.description') }}
            </p>

            <ThemedInput v-model="accessCode" :placeholder="t('redeem.access-code-placeholder')"
                class="w-full mt-6 mb-4" @keyup.enter="redeemCode" />

            <ThemedButton @click="redeemCode" variant="default" class="w-full py-3 text-center" icon="IconKeyFilled"
                :disabled="!accessCode" :loading="isLoading">
                {{ t('redeem.redeem-action') }}
            </ThemedButton>
            <p v-if="redeemError" class="text-red-500 mt-4">{{ redeemError }}</p>
        </template>
        <div v-else class="flex flex-col items-center justify-center w-full">
            <p class="text-green-600 font-semibold text-center mt-4">
                {{ t('redeem.redeem-success') }}
            </p>
            <a href="/home" class="w-full mt-4">
                <ThemedButton variant="default" class="w-full py-3 text-center">
                    {{ t('redeem.go-to-launchpad') }}
                </ThemedButton>
            </a>
            <ThemedButton variant="outlined" class="w-full py-3 text-center mt-2" @click="redeemAnother">
                {{ t('redeem.redeem-another') }}
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
import { useI18n } from "vue-i18n";

const props = defineProps<{
    access_code?: string;
}>();

const axios = useAxios();
const pageContext = usePageContext().value;
const { t } = useI18n();

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
            throw new Error(response.data.message || t('redeem.redeem-error'));
        }

        redeemSuccess.value = true;
        redeemError.value = null;
        accessCode.value = ""; // Clear the input after successful redemption
    } catch (error) {
        console.error("Error redeeming access code:", error);
        redeemError.value = t('redeem.redeem-error');
    } finally {
        isLoading.value = false;
    }
}

</script>
