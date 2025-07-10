// This file contains utility functions for handling redirects in onBeforeRender functions.

export function redirectToHome() {
    return {
        pageContext: {
            redirectTo: '/home',
        },
    };
}
