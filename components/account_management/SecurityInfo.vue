<template>
  <div :aria-busy="isLoading">
    <div
      v-if="user?.external_idp" 
      class="flex flex-col text-center"
    >
    <div class = "text-med  text-left mb-6">
       <p class = "ml-0 font-semibold">
          {{ $t("common.email") }}
        </p>
        <p >
          {{ user?.email }}
        </p>

    </div>
       
      <p class="text-md font-medium">
        {{ $t("security.external") }}
      </p>
    </div>
    <div v-else>
      <div v-if="editEmail">
        <p class="text-xl font-medium">
          {{ $t("security.changeemail") }}
        </p>
        <div class="flex-grow border-t border-gray-400" />
        <NewEmailForm
          :user="user"
          @data-updated="$emit('data-updated')"
          @set-unknown-error="$emit('set-unknown-error', $event)"
        />
      </div>

      <div v-else-if="editPassword">
        <p class="text-xl font-medium">
          {{ $t("security.changepassword") }}
        </p>
        <div class="flex-grow border-t border-gray-400" />
        <NewPasswordForm
          :user="user"
          @password-changed="$emit('data-updated')"
          @set-unknown-error="$emit('set-unknown-error', $event)"
        />
      </div>

      <div v-else>
        <p class="text-xl font-medium">
          {{ $t("security.securityinfo") }}
        </p>
        <div class="flex-grow border-t border-gray-400" />
        <div class="mt-4">
          <p class="text-sm font-light">
            {{ $t("common.email") }}
          </p>
          <p class="font-semibold">
            {{ user?.email }}
          </p>
          <ThemedButton
            @click="() => (editEmail = true)"
            small
            class="mt-2"
            variant="outlined"
          >
            {{ $t("security.changeemail") }}
          </ThemedButton>
        </div>

        <div class="mt-10">
          <p class="text-sm font-light">
            {{ $t("security.lastchanged") }}
          </p>
          <p class="font-semibold">
            {{ formattedLastChange }}
          </p>
          <ThemedButton
            variant="outlined"
            class='mt-2 '
            @click="() => (editPassword = true)"
            small
          >
            {{ $t("security.changepassword") }}
          </ThemedButton>
        </div>
        <div class="mt-10">
          <div class="flex flex-row cursor-pointer" @click="() => (showDangerZone = !showDangerZone)">
            <p class="text-sm font-semibold text-red-500">
              {{ $t("security.dangerzone") }}
            </p>
            <FontAwesomeIcon
              :icon="['fa-solid', showDangerZone ? 'chevron-down' : 'chevron-right']"
              class="text-red-500 ml-2 mt-[5px] h-3"
            />
          </div>
          <ThemedButton
            variant="danger"
            class='mt-4'
            @click="openDeleteAccountModal"
            small
            v-if="showDangerZone && !pendingDeletion"
          >
            {{ $t("security.deleteaccount") }}
          </ThemedButton>
        </div>
      </div>
    </div>
      <ThemedModal ref="deleteAccountModal">
        <p class="text-center text-2xl font-medium">{{ $t('delete-account.header')}}</p>
        <p class="text-center mt-4 max-w-3xl">{{ $t('delete-account.confirm')}}</p>
        <div class="flex justify-center mt-8">
          <ThemedButton
            @click="submitDeleteAccount"
            variant="danger"
            class="w-40"
            :loading="isLoading"
          >
            {{ $t('delete-account.delete')}}
          </ThemedButton>
          <ThemedButton
            @click="closeDeleteAccountModal"
            variant="outlined"
            class="w-40 ml-4"
          >
            {{ $t('common.cancel')}}
          </ThemedButton>
        </div>
      </ThemedModal>
  </div>
</template>

<script lang="ts" setup>
  import { ref, watch, computed, h, Teleport } from 'vue';
  import ThemedButton from '../ThemedButton.vue';
  import NewEmailForm from './NewEmailForm.vue';
  import NewPasswordForm from './NewPasswordForm.vue';
  import { useI18n } from 'vue-i18n';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { useAxios } from '@renderer/useAxios';
  import ThemedModal from '../ThemedModal.vue';
  

  const emit = defineEmits<{
    (e: 'set-unknown-error', error: boolean): void;
    (e: 'data-updated'): void;
  }>();
  const props = defineProps<{ user?: Record<string, string>, pendingDeletion?: string }>();
  const { t } = useI18n();
  const axios = useAxios();
  const deleteAccountModal = ref<InstanceType<typeof ThemedModal>>();

  const editEmail = ref(false);
  const editPassword = ref(false);
  const currentPassword = ref('');
  const newPassword = ref('');
  const newPasswordConfirm = ref('');
  const newPasswordError = ref(false);
  const isLoading = ref(false);
  const showDangerZone = ref(false);
  const formattedLastChange = computed(() => {
    if (!props.user?.last_password_change) return t('security.never');
    const dateStr = new Date(props.user?.last_password_change).toLocaleDateString(
      'en-US',
      { timeZone: 'UTC' },
    );
    const timeStr = new Date(props.user?.last_password_change).toLocaleTimeString(
      'en-US',
      { timeZone: 'UTC' },
    );
    return `${dateStr} at ${timeStr} (UTC)`;
  });

  // Reset state when switching between email and password. User can only edit one at a time
  watch(
    () => [editEmail, editPassword],
    () => {
      if (editEmail.value) {
        editPassword.value = false;
        currentPassword.value = '';
        newPassword.value = '';
        newPasswordConfirm.value = '';
        newPasswordError.value = false;
      }
      if (editPassword.value) {
        editEmail.value = false;
      }
    },
  );

  const openDeleteAccountModal = () => {
    deleteAccountModal.value?.show();
  };

  const closeDeleteAccountModal = () => {
    deleteAccountModal.value?.close();
  };

  async function submitDeleteAccount() {
    try {
      if(!props.user?.uuid) return;
      isLoading.value = true;

      const res = await axios.post(`/users/${props.user.uuid}/init-delete-account`);
      if (res.status !== 200) {
        throw new Error('Failed to delete account');
      }

      emit('data-updated');
    } catch (e) {
      emit('set-unknown-error', true);
    } finally {
      isLoading.value = false;
    }
  }
</script>
