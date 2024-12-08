import { resolve } from 'node:path'
import { defineConfig, type PluginOption } from 'vite'
import libAssetsPlugin from '@laynezh/vite-plugin-lib-assets'
import makeManifestPlugin from './utils/plugins/make-manifest-plugin'
import { watchPublicPlugin, watchRebuildPlugin } from '@extension/hmr'
import { isDev, isProduction, watchOption } from '@extension/vite-config'
import checker from 'vite-plugin-checker'

const rootDir = resolve(__dirname)
const srcDir = resolve(rootDir, 'src')
const outDir = resolve(rootDir, '..', 'dist')

export default defineConfig({
	resolve: {
		alias: {
			'@root': rootDir,
			'@src': srcDir,
			'@assets': resolve(srcDir, 'assets')
		}
	},
	plugins: [
		libAssetsPlugin({
			outputPath: outDir
		}) as PluginOption,
		watchPublicPlugin(),
		makeManifestPlugin({ outDir }),
		isDev && watchRebuildPlugin({ reload: true }),
		checker({
			typescript: false
		}) as unknown as PluginOption
	],
	publicDir: resolve(rootDir, 'public'),
	build: {
		outDir,
		emptyOutDir: false,
		sourcemap: isDev,
		minify: isProduction,
		reportCompressedSize: isProduction,
		watch: watchOption,
		rollupOptions: {
			input: {
				background: resolve(srcDir, 'background/index.ts'),
				login: resolve(srcDir, 'login/login.html'),
				subscribe: resolve(srcDir, 'subscribe/subscribe.html')
			},
			output: {
				format: 'esm', // 使用ESM格式
				entryFileNames: '[name].js' // 输出 background.js, login.js, subscribe.js
			},
			external: ['chrome']
		}
	},
	envDir: '../'
})
