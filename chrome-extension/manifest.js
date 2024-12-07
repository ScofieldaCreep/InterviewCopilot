import fs from 'node:fs'
import deepmerge from 'deepmerge'

const packageJson = JSON.parse(fs.readFileSync('../package.json', 'utf8'))

const isFirefox = process.env.__FIREFOX__ === 'true'

/**
 * After changing, please reload the extension at `chrome://extensions`
 * @type {chrome.runtime.ManifestV3}
 */
const manifest = deepmerge(
	{
		manifest_version: 3,
		default_locale: 'en',
		name: 'Interview Copilot',
		version: packageJson.version,
		key: 'TUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF0ekU3Zm1SMTROZDdWQXdhM0lFOFR5MGlXemFSNitIdWNJekNhN0p2UTVXS2dFY0c0NDMvRDNjK05HeEJTM0RibytVdkdFZlM0d05uUmNkQVNlalNtbm1oelEzbnJlalNKcXpXekVGNnh0bU5saUpQTzhYZE1RYng5TW1rbjduN29wUWlHczBmaWZvR0hiR1hEOUFlbFFNcU90UHRxQzEzcW93SWN0bGU3ZkdWb21yUmtLQXdoS1JMSTVua1lORStUcStscnB5bXpsMmR4UnFTWWdnTEZqK3hYdUdrWjlPd01JSWRhOU0wcE1vL3hqZ1I2WEJhNit2TlQ2U3pQRXNSUER6ZXp3YjZ0SUZPdjlXRUxVZ2YyUmM4aUlvYm1WSFhzamtPUTVERUFvVFdUdGphTFREajBDMjdYOTJ5YWJSWGxDSFJYclF5K3YwVUJGbU9rRmV0K0h1Y0l6Q2E3SnZRNVdLZ0VjRzQ0My9EM2MrTkd4QlMzRGJvK1V2R0VmUzR3Tm5SY2RBU2VqU21ubWh6UTNucmVqU0pxeld6RUY2eHRtTmxpSlBPOFhkTVFieDlNbWtuN243b3BRaUdzMGZpZm9HSGJHWEQ5QWVsUU1xT3RQdHFDMTNxb3dJY3RsZTdmR1ZvbXJSa0tBd2hLUkxJNW5rWU5FK1RxK2xycHltemwyZHhScVNZZ2dMRmoreFh1R2taOU93TUlJZGE5TTBwTW8veGpnUjZYQmE2K3ZOVDZTelBFc1JQRHplendiNnRJRk92OVdFTFVnZjJSYzhpSW9ibVZIWHNqa09RNURFQW9UV1R0amFMVERqMEMyN1g5MnlhYlJYbENIUlhyUXkrdjBVQkZtT2tGZXQK',
		description: '帮助面试者快速获取算法题解答的Chrome扩展',
		host_permissions: ['<all_urls>'],
		permissions: [
			'storage',
			'scripting',
			'tabs',
			'notifications',
			'commands',
			'offscreen',
			'activeTab',
			'tabGroups',
			'windows',
			'identity',
			'identity.email'
		],
		background: {
			service_worker: 'background.iife.js',
			type: 'module'
		},
		action: {
			default_popup: 'popup/index.html',
			default_icon: 'icon-34.png'
		},
		icons: {
			128: 'icon-128.png'
		},
		content_scripts: [
			{
				matches: ['http://*/*', 'https://*/*', '<all_urls>'],
				js: ['content/index.js']
			},
			{
				matches: ['http://*/*', 'https://*/*', '<all_urls>'],
				css: ['content.css'] // public folder
			}
		],
		web_accessible_resources: [
			{
				resources: [
					'*.html',
					'*.iife.js',
					'*.js',
					'*.css',
					'*.svg',
					'icon-128.png',
					'icon-34.png'
				],
				matches: ['*://*/*']
			},
			{
				resources: ['~signInWithPopup.js'],
				matches: ['https://interviewcopilot-443620.web.app/*']
			},
			{
				resources: ['offscreen.html'],
				matches: ['<all_urls>']
			},
			{
				resources: ['firebase/*.js', 'firebase/*/*.js'],
				matches: ['<all_urls>']
			}
		],
		commands: {
			_execute_action: {
				suggested_key: {
					default: 'Alt+Shift+Y',
					mac: 'Alt+Shift+Y'
				},
				description: '打开配置页面'
			},
			get_answer: {
				suggested_key: {
					default: 'Alt+Q',
					mac: 'Alt+Q'
				},
				description: '直接获取题解'
			}
		},
		oauth2: {
			client_id:
				'318745197838-vs8it7uvf65s70ki3g113abd2d3tk5o4.apps.googleusercontent.com',
			scopes: [
				'https://www.googleapis.com/auth/userinfo.email',
				'https://www.googleapis.com/auth/userinfo.profile'
			]
		}
		// content_security_policy: {
		// 	extension_pages: "script-src 'self' ; object-src 'self'"
		// }
	},
	!isFirefox
)

export default manifest
