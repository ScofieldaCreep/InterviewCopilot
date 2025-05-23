import { watchPublicPlugin, watchRebuildPlugin } from '@extension/hmr';
import { isDev, watchOption } from '@extension/vite-config';
import libAssetsPlugin from '@laynezh/vite-plugin-lib-assets';
import { resolve } from 'node:path';
import { defineConfig, type PluginOption } from 'vite';
import checker from 'vite-plugin-checker';
import makeManifestPlugin from './utils/plugins/make-manifest-plugin';

const rootDir = resolve(__dirname);
const srcDir = resolve(rootDir, 'src');
const outDir = resolve(rootDir, '..', 'dist');

export default defineConfig({
  resolve: {
    alias: {
      '@root': rootDir,
      '@src': srcDir,
      '@assets': resolve(srcDir, 'assets'),
    },
  },
  server: {
    hmr: false, // 禁用 HMR WebSocket 连接
  },
  plugins: [
    libAssetsPlugin({ outputPath: outDir }) as PluginOption,
    watchPublicPlugin(),
    makeManifestPlugin({ outDir }),
    isDev && watchRebuildPlugin({ reload: true }),
    checker({ typescript: false }) as unknown as PluginOption,
  ],
  publicDir: resolve(rootDir, 'public'),
  build: {
    outDir,
    emptyOutDir: false,
    sourcemap: isDev,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
      },
      format: {
        comments: false,
      },
    },
    reportCompressedSize: true,
    watch: watchOption,
    assetsDir: '.',
    rollupOptions: {
      input: {
        background: resolve(srcDir, 'background/index.ts'),
        login: resolve(rootDir, 'login.html'),
      },
      output: {
        format: 'esm',
        entryFileNames: '[name].js',
        assetFileNames: '[name][ext]',
      },
      external: ['chrome'],
    },
  },
  envDir: '../',
});
