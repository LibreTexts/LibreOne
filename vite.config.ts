import path from 'path';
import vue from '@vitejs/plugin-vue';
import ssr from 'vite-plugin-ssr/plugin';
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import { UserConfig } from 'vite';
// @ts-ignore
import postcss from './postcss.config';

const config: UserConfig = {
  css: {
    postcss,
  },
  plugins: [
    vue(),
    ssr(),
    VueI18nPlugin({
      include: path.resolve(__dirname, 'locales/**'),
    }),
  ],
  resolve: {
    alias: {
      '@server': path.join(__dirname, 'server'),
      '@renderer': path.join(__dirname, 'renderer'),
      '@components': path.join(__dirname, 'components'),
      '@pages': path.join(__dirname, 'pages'),
      '@locales': path.join(__dirname, 'locales'),
    },
  },
  ssr: {
    noExternal: ['vue-i18n'],
  },
};

export default config;
