<template>
    <StandardPageLayout>
        <div aria-live="polite">
            <RedeemAccessCode />
        </div>
    </StandardPageLayout>
</template>

<script setup lang="ts">
import { usePageProps } from '@renderer/usePageProps';
import { Application } from '@server/types/applications';
import StandardPageLayout from '../../components/layout/StandardPageLayout.vue';
import ThemedButton from '../../../components/ThemedButton.vue';
import { useI18n } from 'vue-i18n';
import { usePageContext } from '@renderer/usePageContext';
import { ref } from 'vue';
import axios from 'axios';
import LoadingIndicator from '../../../components/LoadingIndicator.vue';
import { IconCircleCheck } from '@tabler/icons-vue';
import RedeemAccessCode from '@components/account_management/RedeemAccessCode.vue';

const props = usePageProps<{ trial_expired?: boolean; application?: Application | null, service_url?: string | null }>();
const { t } = useI18n();
const pageContext = usePageContext();


</script>