import { ref, onMounted, onUnmounted } from 'vue';

/**
 * A reusable Vue composable that provides a reactive boolean indicating whether the current viewport
 * is greater than or equal to a specified Tailwind CSS breakpoint.
 */
export function useTailwindBreakpoint(breakpoint: string) {
    const isActive = ref(false);
    const breakpoints = ref({
        sm: 640,
        md: 768,
        lg: 1024,
        xl: 1280,
        '2xl': 1536,
    });

    const checkBreakpoint = () => {
        isActive.value = breakpoints.value[breakpoint] !== undefined && window.innerWidth >= breakpoints.value[breakpoint];
    };

    onMounted(() => {
        checkBreakpoint();
        window.addEventListener('resize', checkBreakpoint);
    });

    onUnmounted(() => {
        window.removeEventListener('resize', checkBreakpoint);
    });

    return isActive;
}