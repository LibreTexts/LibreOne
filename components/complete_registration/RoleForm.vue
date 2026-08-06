<template>
  <div aria-live="polite" :aria-busy="loading">
    <Heading :level="3" class="text-center">
      {{
        $t("complete_registration_role.header", {
          name: pageContext?.user?.first_name,
        })
      }}
      </Heading>
    <p class="text-center mt-4">
      {{ $t("complete_registration_role.tagline") }}
    </p>
    <p class="text-center mt-1 text-sm text-gray-500">
      {{ $t("complete_registration_role.changelater") }}
    </p>
    <template v-if="!loading">
      <Transition
        mode="out-in"
        enter-from-class="motion-safe:translate-x-full"
        enter-to-class="motion-safe:translate-x-0"
        leave-from-class="motion-safe:translate-x-0"
        leave-to-class="motion-safe:-translate-x-full"
        enter-active-class="motion-safe:transition-transform motion-safe:ease-out motion-safe:duration-500"
        leave-active-class="motion-safe:transition-transform motion-safe:ease-in motion-safe:duration-300"
      >
        <div class="mt-8 flex flex-col gap-4">
          <Button full-width @click="submitRoleUpdate('student')">
            {{ $t("complete_registration_role.student_user") }}
          </Button>
          <Button full-width @click="submitRoleUpdate('instructor')">
            {{ $t("complete_registration_role.instructor_user") }}
          </Button>
          <p class="text-center text-gray-500 text-xs mt-3 mx-3">
            <IconInfoCircle :size="16" class="inline align-text-bottom" />
            {{ $t("complete_registration_role.instructor_info") }}
          </p>
        </div>
      </Transition>
    </template>
    <div v-else class="flex items-center justify-center p-8">
      <LoadingIndicator class="!h-8 !w-8" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { useAxios } from "@renderer/useAxios";
import { usePageContext } from "@renderer/usePageContext";
import { IconInfoCircle } from "@tabler/icons-vue";
import LoadingIndicator from "@components/LoadingIndicator.vue";
import { Button, Heading } from "@libretexts/davis-vue";

const props = defineProps<{ uuid: string }>();
const emit = defineEmits<{
  (e: "role-update"): void;
}>();
const pageContext = usePageContext().value;
const axios = useAxios();

const loading = ref(false);

/**
 * Submits the role to the server, then emits the 'role-update' event.
 *
 * @param role - Role identifier to submit.
 */
async function submitRoleUpdate(role: string) {
  loading.value = true;
  try {
    await axios.patch(`/users/${props.uuid}`, { user_type: role });
    loading.value = false;
    emit("role-update");
  } catch (e) {
    loading.value = false;
  }
}
</script>
