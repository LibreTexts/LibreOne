<template>
  <header>
    <nav
      class="flex flex-col w-auto items-center justify-between content-between md:p-6 p-4"
      aria-label="Global"
    >
      <section class="flex flex-row w-full items-center justify-between">
        <AppSwitcher
          class="ml-2 pt-1"
          v-if="$props.authorized"
        />
        <a
          href="/home"
          v-else>
          <img
            src="@renderer/libretexts_logo.png"
            alt="Home"
            class="h-9 w-auto mb-1"
          >
        </a>
        <div class="hidden lg:flex lg:flex-row lg:flex-1 lg:ml-8">
          <a
            v-for="(item, idx) in navItems"
            :href="item.link"
            :key="idx"
            class="text-md font-semibold leading-6 text-gray-900"
            :class="idx > 0 ? 'ml-6' : ''"
            :title="item.title"
          >
            {{ item.title }}
          </a>
          <a
            href="https://donate.libretexts.org"
            target="_blank"
            key="donate-link"
            class="text-md font-semibold leading-6 text-gray-900 ml-6"
          >
            {{ $t("common.donate") }}
          </a>
        </div>
        <div
          class="hidden lg:flex flex-row items-center w-auto relative user-menu-container"
          v-if="$props.authorized"
        >
          <button
            @click="userMenuOpen = !userMenuOpen"
            class="flex flex-row items-center hover:opacity-80 transition-opacity focus:outline-none"
            aria-label="User menu"
            :aria-expanded="userMenuOpen"
          >
            <UserAvatar
              :src="pageContext.user?.avatar"
              :width="40"
              class="mt-1"
            />

            <div class="flex flex-col ml-2 mr-2 text-left">
              <div class="text-l font-semibold">
                {{ pageContext.user?.first_name + " " + pageContext.user?.last_name }}
              </div>
              <div class="text-xs">
                <span>{{ pageContext.user?.email }}</span>
                <span v-if="pageContext.user?.verify_status === 'verified'"> | <span class="text-green-600 font-semibold">Verified Instructor</span></span>
              </div>
            </div>
            <FontAwesomeIcon
              icon="chevron-down"
              class="w-4 h-4 ml-1 text-gray-600 transition-transform duration-200"
              :class="userMenuOpen ? 'rotate-180' : ''"
            />
          </button>

          <!-- Dropdown Menu -->
          <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
          >
            <div
              v-if="userMenuOpen"
              class="absolute right-0 top-full mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
              @click.stop
            >
              <div class="py-1" role="menu" aria-orientation="vertical">
                <a
                  href="/profile"
                  @click="userMenuOpen = false"
                  class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  <FontAwesomeIcon
                    icon="user"
                    class="w-4 h-4 mr-3 text-gray-600"
                  />
                  Profile
                </a>
                <a
                  href="/security"
                  @click="userMenuOpen = false"
                  class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  <FontAwesomeIcon
                    icon="lock"
                    class="w-4 h-4 mr-3 text-gray-600"
                  />
                  Security
                </a>
                <div class="border-t border-gray-100"></div>
                <button
                  @click="handleLogout(); userMenuOpen = false"
                  class="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  role="menuitem"
                >
                  <FontAwesomeIcon
                    icon="right-from-bracket"
                    class="w-4 h-4 mr-3 text-gray-600"
                  />
                  Log out
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <div class="flex flex-row mr-2 items-center">
          <button
            @click="handleGoToLogin()"
            class="hidden lg:block text-sm font-semibold leading-6 text-black"
            v-if="!$props.authorized"
          >
            <span>{{ $t("common.signin") }}</span>
          </button>
          <FontAwesomeIcon
            class="lg:hidden clicked-animation"
            @click="menuOpen = !menuOpen"
            aria-label="Open Navigation Menu"
            :class="menuOpen ? 'motion-safe:-rotate-90' : ''"
            icon="fa-solid fa-bars"
            size="lg"
          />
        </div>
      </section>
      <Transition
        mode="out-in"
        enter-from-class="motion-safe:translate-x-full"
        enter-to-class="motion-safe:translate-x-0"
        leave-from-class="motion-safe:translate-x-0"
        leave-to-class="motion-safe:-translate-x-full"
        enter-active-class="motion-safe:transition-transform motion-safe:ease-out motion-safe:duration-300"
        leave-active-class="motion-safe:transition-transform motion-safe:ease-in motion-safe:duration-300"
      >
        <section
          v-if="menuOpen"
          class="flex flex-col justify-start w-full mt-3"
        >
          <div class="flex flex-col justify-start items-start w-full">
            <div
              class="flex flex-row items-center w-auto"
              v-if="$props.authorized"
            >
              <UserAvatar
                :src="pageContext.user?.avatar"
                :width="40"
                class="mt-1"
              />

              <div
                class="flex flex-col ml-2 mr-4"
              >
                <div class="text-l font-semibold line-clamp-2">
                  {{ pageContext.user?.first_name + " " + pageContext.user?.last_name }}
                </div>
                <div class="text-xs">
                  <span>{{ pageContext.user?.email }}</span>
                  <span v-if="pageContext.user?.verify_status === 'verified'"> | <span class="text-green-600 font-semibold">Verified Instructor</span></span>
                </div>
              </div>
            </div>
            <a
              v-for="(item, idx) in navItems"
              :key="idx"
              :href="item.link"
              class="text-md font-semibold leading-6 text-gray-900 my-2"
            >
              {{ item.title }}
            </a>
            <button
              @click="$props.authorized ? handleLogout() : handleGoToLogin()"
              class="text-sm font-semibold leading-6 mt-6"
              :class="$props.authorized ? 'text-gray-500' : 'text-black'"
            >
              {{ $t($props.authorized ? "common.logout" : "common.signin") }}
            </button>
          </div>
        </section>
      </Transition>
    </nav>
  </header>
</template>

<script lang="ts" setup>
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import AppSwitcher from './AppSwitcher.vue';
  import { usePageContext } from '@renderer/usePageContext';
  import UserAvatar from '../account_management/UserAvatar.vue';

  const pageContext = usePageContext().value;

  // Local Types
  type NavItem = {
    title: string;
    link: string;
  };

  // Props & Context
  const props = withDefaults(
    defineProps<{
      authorized?: boolean;
      userRole?: string;
    }>(),
    {
      authorized: false,
      userRole: undefined
    },
  );

  // Data & UI
  const menuOpen = ref<boolean>(false);
  const userMenuOpen = ref<boolean>(false);
  const baseItems: NavItem[] = [
    {
      title: 'Home',
      link: '/home',
    },
  ];
  const authItems: NavItem[] = [
    {
      title: 'Profile',
      link: '/profile',
    },
    {
      title: 'Security',
      link: '/security',
    }
  ];
  const instructorItems = [
    {
      title: 'Instructor',
      link: '/instructor',
    }
  ]

  const navItems = computed<NavItem[]>(() => {
    if (props.userRole === 'instructor' && props.authorized) {
      return [...baseItems, ...authItems, ...instructorItems];
    }
    if (props.userRole === 'student' && props.authorized) {
      return [...baseItems, ...authItems];
    }
    return baseItems;
  });

  // Methods
  function handleLogout() {
    window.location.href = '/api/v1/auth/logout';
  }

  function handleGoToLogin() {
    window.location.href = '/api/v1/auth/login';
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (userMenuOpen.value && !target.closest('.user-menu-container')) {
      userMenuOpen.value = false;
    }
  }

  onMounted(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
  });
</script>

<style lang="css">
.clicked-animation {
  transition: transform 0.4s ease-in-out;
}
</style>