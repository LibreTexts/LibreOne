<template>
    <StandardPageLayout>
        <div aria-live="polite">
            <RedeemAccessCode v-bind="props" />
        </div>
    </StandardPageLayout>
</template>

<script setup lang="ts">
import { usePageProps } from '@renderer/usePageProps';
import StandardPageLayout from '../../components/layout/StandardPageLayout.vue';
import RedeemAccessCode from '@components/account_management/RedeemAccessCode.vue';

const props = usePageProps<{ access_code?: string }>();


</script>