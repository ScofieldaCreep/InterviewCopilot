import deepmerge from 'deepmerge';
import fs from 'node:fs';

const packageJson = JSON.parse(fs.readFileSync('../package.json', 'utf8'));

const isFirefox = process.env.__FIREFOX__ === 'true';

/**
 * After changing, please reload the extension at `chrome://extensions`
 * @type {chrome.runtime.ManifestV3}
 */
const manifest = deepmerge(
  {
    manifest_version: 3,
    default_locale: 'en',
    name: 'Algo Ace',
    version: packageJson.version,
    // key: 'TUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF0ekU3Zm1SMTROZDdWQXdhM0lFOFR5MGlXemFSNitIdWNJekNhN0p2UTVXS2dFY0c0NDMvRDNjK05HeEJTM0RibytVdkdFZlM0d05uUmNkQVNlalNtbm1oelEzbnJlalNKcXpXekVGNnh0bU5saUpQTzhYZE1RYng5TW1rbjduN29wUWlHczBmaWZvR0hiR1hEOUFlbFFNcU90UHRxQzEzcW93SWN0bGU3ZkdWb21yUmtLQXdoS1JMSTVua1lORStUcStscnB5bXpsMmR4UnFTWWdnTEZqK3hYdUdrWjlPd01JSWRhOU0wcE1vL3hqZ1I2WEJhNit2TlQ2U3pQRXNSUER6ZXp3YjZ0SUZPdjlXRUxVZ2YyUmM4aUlvYm1WSFhzamtPUTVERUFvVFdUdGphTFREajBDMjdYOTJ5YWJSWGxDSFJYclF5K3YwVUJGbU9rRmV0K0h1Y0l6Q2E3SnZRNVdLZ0VjRzQ0My9EM2MrTkd4QlMzRGJvK1V2R0VmUzR3Tm5SY2RBU2VqU21ubWh6UTNucmVqU0pxeld6RUY2eHRtTmxpSlBPOFhkTVFieDlNbWtuN243b3BRaUdzMGZpZm9HSGJHWEQ5QWVsUU1xT3RQdHFDMTNxb3dJY3RsZTdmR1ZvbXJSa0tBd2hLUkxJNW5rWU5FK1RxK2xycHltemwyZHhScVNZZ2dMRmoreFh1R2taOU93TUlJZGE5TTBwTW8veGpnUjZYQmE2K3ZOVDZTelBFc1JQRHplendiNnRJRk92OVdFTFVnZjJSYzhpSW9ibVZIWHNqa09RNURFQW9UV1R0amFMVERqMEMyN1g5MnlhYlJYbENIUlhyUXkrdjBVQkZtT2tGZXQK',
    key: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu0A010tL6tKgqIzFJk7ZPomos9d8sk6h0rjxpMjp6DIsaIhcuaT77izhgu8GVZgQ/0raoNpuSMHIxp/rgwZC2wDbEdyuvPASOT9bf9PfWzCX4xYIoZHKaKBIWNPwHB4ZddbXKT20DaTfOM/CSLnxk6/WcQKtx/YT984/eN/PbkZLhFTbKc7kLjHbNzQU61+IdOOFqXYotw8MeWkQWWFr9Ix/t7L30/ZlzaVkij0wJj+MZwCB1rXxI1CPiyqYBOcNBE/jaUzjLsmMsN6ysbh26KK5CYo2dBJQX0ABVfg4ZcCPgEzr2UmY+892e0nf6E5zRNn7Gu5fBEGD7FohdWiHgwIDAQAB',
    description:
      'AI-driven interview pal. Easy approach to correct solutions for all coding problems. All In One Click.',
    permissions: [
      'storage', // 用于访问 chrome.storage API，在扩展中存储和读取数据（例如用户信息、设置信息）
      'scripting', // 用于通过 chrome.scripting.executeScript 动态向页面注入脚本
      'commands', // 用于响应用户定义的快捷键（chrome.commands.onCommand事件）
      'activeTab', // 当用户与扩展交互（如点击action icon）时，临时获得访问当前活动标签页的权限，可对当前页执行脚本
      'windows', // 用于创建、修改和查询浏览器窗口（如chrome.windows.create创建popup窗口）
      'identity', // 用于使用chrome.identity获取OAuth令牌，实现Google账户认证相关功能
      'identity.email', // 在使用identity获取用户信息时，可访问用户的基本个人资料（如email），确保你要使用profile信息才需要这个权限
      'system.display', // 用于获取显示器信息
      'notifications', // 添加通知权限
    ],
    background: {
      service_worker: 'background.js',
      type: 'module',
    },
    action: {
      default_popup: 'popup/index.html',
      default_icon: 'icon48.png',
    },
    icons: {
      16: 'icon16.png',
      19: 'icon19.png',
      32: 'icon32.png',
      38: 'icon38.png',
      48: 'icon48.png',
      128: 'icon128.png',
    },
    web_accessible_resources: [
      {
        resources: [
          '*.html',
          '*.iife.js',
          '*.js',
          '*.css',
          '*.svg',
          'icon16.png',
          'icon32.png',
          'icon48.png',
          'icon128.png',
          'highlight.min.css',
        ],
        matches: ['*://*/*'],
      },
      {
        resources: ['~signInWithPopup.js'],
        matches: ['https://interviewcopilot-443620.web.app/*'],
      },
      {
        resources: ['firebase/*.js', 'firebase/*/*.js'],
        matches: ['http://*/*', 'https://*/*'],
      },
    ],
    commands: {
      // _execute_action: {
      //   suggested_key: {
      //     default: 'Alt+Shift+S',
      //     mac: 'Alt+Shift+S',
      //   },
      //   description: 'Open Config Popup',
      // },
      get_answer: {
        suggested_key: {
          default: 'Alt+Q',
          mac: 'Alt+Q',
        },
        description: 'Get Solution',
      },
    },
    oauth2: {
      client_id: '318745197838-vs8it7uvf65s70ki3g113abd2d3tk5o4.apps.googleusercontent.com',
      scopes: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
    },
  },
  !isFirefox,
);

export default manifest;
