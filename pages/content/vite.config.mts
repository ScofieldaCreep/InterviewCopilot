import { resolve } from 'path'
import { defineConfig } from 'vite'
import { makeEntryPointPlugin } from '@extension/hmr'

// 不从 @extension/vite-config 导入，直接定义
const isDev = process.env.__DEV__ === 'true'
const isProduction = !isDev

export default defineConfig({
	build: {
		outDir: resolve(__dirname, '../../dist/content'),
		emptyOutDir: false,
		sourcemap: isDev,
		minify: isProduction,
		reportCompressedSize: isProduction,
		rollupOptions: {
			input: resolve(__dirname, 'src/index.ts'),
			output: {
				format: 'iife',
				entryFileNames: 'index.js'
			},
			external: ['chrome']
		}
	},
	plugins: [isDev && makeEntryPointPlugin()]
})
