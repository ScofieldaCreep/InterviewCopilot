import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
	base: './', // 设置base为相对路径
	build: {
		outDir: resolve(__dirname, '..', '..', 'dist', 'subscribe'),
		rollupOptions: {
			input: {
				subscribe: resolve(__dirname, 'index.html')
			}
		}
	}
})
