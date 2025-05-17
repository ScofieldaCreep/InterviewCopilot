# Interview Copilot / AlgoAce Chrome Extension

[English | 中文说明见下方]

---

## Overview
Interview Copilot (AlgoAce) is a Chrome extension designed to help you ace your coding interviews with instant, AI-powered solutions and productivity tools. It integrates with LeetCode and other coding platforms, providing undetectable, real-time assistance and a seamless user experience.

- **Chrome Web Store:** [https://chromewebstore.google.com/detail/algo-ace/jgmbkilelblcdpcokkclihbedbmccdla](https://chromewebstore.google.com/detail/algo-ace/jgmbkilelblcdpcokkclihbedbmccdla)
- **Features:**
  - Instant AI solutions for coding problems
  - Multiple language and model support
  - Privacy-first, undetectable design
  - Pro/Trial modes with subscription management
  - Customizable notifications and UI
  - Works with LeetCode, coding interviews, and algorithm practice
  - Fast, undetectable, and privacy-focused

## Quick Start (Local Development)

1. **Install dependencies**
   ```sh
   pnpm install
   ```
2. **Build the extension**
   ```sh
   pnpm run build
   ```
   或者开发模式热重载：
   ```sh
   pnpm run dev
   ```
3. **Package for Chrome**
   ```sh
   pnpm run zip
   # 或者手动将 dist-zip/extension.zip 解压后 dist 目录作为 Chrome 扩展包
   ```
4. **Load in Chrome**
   - 打开 Chrome，访问 `chrome://extensions/`
   - 开启“开发者模式”
   - 点击“加载已解压的扩展程序”，选择 `chrome-extension/dist` 目录

## SEO Keywords
- Chrome extension for coding interviews
- LeetCode AI assistant
- Algorithm interview helper
- AI LeetCode solution
- Coding interview Copilot
- AlgoAce
- 面试助手插件
- 算法面试AI
- LeetCode刷题助手

## Open Source Notice
This repository contains the front-end code for the Interview Copilot Chrome extension. All sensitive keys and backend secrets are **excluded**. Please ensure you configure your own Firebase and backend services before deploying or contributing.

---

# 中文说明

## 简介
Interview Copilot（AlgoAce）是一款专为算法面试打造的 Chrome 插件，集成 AI 实时解题、隐身模式、快捷键等功能，助你高效通过 LeetCode 等平台的刷题与面试。

- **插件商店地址：** [https://chromewebstore.google.com/detail/algo-ace/jgmbkilelblcdpcokkclihbedbmccdla](https://chromewebstore.google.com/detail/algo-ace/jgmbkilelblcdpcokkclihbedbmccdla)
- **主要功能：**
  - 一键获取 AI 解题思路与代码
  - 支持多种语言和 AI 模型
  - 隐身模式，100% 不被检测
  - 试用/订阅模式，支持订阅管理
  - 通知与界面可自定义
  - 支持 LeetCode、算法面试、刷题场景
  - 极速、隐私优先

## 本地开发与打包

1. **安装依赖**
   ```sh
   pnpm install
   ```
2. **开发模式（热重载）**
   ```sh
   pnpm run dev
   ```
3. **打包构建**
   ```sh
   pnpm run build
   ```
4. **打包为 Chrome 扩展**
   ```sh
   pnpm run zip
   # 或手动将 dist-zip/extension.zip 解压后 dist 目录作为 Chrome 扩展包
   ```
5. **在 Chrome 加载扩展**
   - 打开 Chrome，访问 `chrome://extensions/`
   - 开启“开发者模式”
   - 点击“加载已解压的扩展程序”，选择 `chrome-extension/dist` 目录

## SEO 关键词
- Chrome 算法面试插件
- LeetCode AI 助手
- 刷题 AI Copilot
- 算法面试神器
- AI 解题助手
- AlgoAce

## 开源说明
本仓库仅包含前端代码，所有敏感密钥与后端服务均未公开。部署或二次开发前，请自行配置 Firebase 及后端服务，确保安全。

---
** 免责 **

欢迎随意使用、随意提意见，上岸请多多推荐，没上岸欢迎来提 issue 骂我！

Feel free to use, fork, and give feedback. If this project helps you land an offer, please recommend it! If not, open an issue and lemme close it lolol.
