import axios, { AxiosInstance} from 'axios';
import { App, InjectionKey, inject } from 'vue';

interface AxiosOptions {
  baseUrl?: string;
}

const key: InjectionKey<AxiosInstance> = Symbol();

/**
 * Inject the global Axios instance into a component.
 *
 * @returns The global Axios instance.
 */
export function useAxios() {
  const axiosInstance = inject(key);
  if (!axiosInstance) {
    throw new Error('initAxios() not called in parent');
  }
  return axiosInstance;
}

/**
 * Initializes a global Axios instance for use anywhere in the app.
 *
 * @param app - The Vue app instance.
 * @param options - Custom options for the Axios instance constructor.
 */
export function initAxios(app: App, options: AxiosOptions) {
  app.provide(key, axios.create({
    baseURL: options.baseUrl,
  }));
}
