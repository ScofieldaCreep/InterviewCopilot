/**
 * background.js - 扩展的后台服务脚本
 * 作为service worker运行，可以使用大多数Chrome Extension APIs
 * 通过事件驱动的方式来执行操作
 */

// 默认的提示词模板
const DEFAULT_PROMPT_TEMPLATE = `
请分析以下算法题目，并给出详细解答：
{content}

要求：
1. 使用{language},使用markdown格式回答
2. 使用Python3语言,并保持Python3的代码风格
3. 分析题目关键点和考察要点
4. 给出最优解法的思路和推导过程
5. 提供完整的代码实现（包含必要的注释）
6. 分析时间和空间复杂度
7. 补充其他解法（如果有）
{context}
`.trim()

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'getAnswer' && request.tabId) {
		querySolution({ id: request.tabId } as chrome.tabs.Tab)
	}
})

// 监听扩展图标点击
chrome.action.onClicked.addListener(querySolution)

// 监听快捷键命令
chrome.commands.onCommand.addListener(async command => {
	console.log('Command triggered:', command)

	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
	if (!tab) {
		console.error('No active tab found')
		return
	}

	if (command === '_execute_action') {
		// 打开配置页面
		console.log('Use Alt+Shift+Y to open popup')
		await chrome.action.openPopup()
	} else if (command === 'get_answer') {
		// 直接获取题解
		console.log('Use Alt+Q to get answer')
		await querySolution(tab)
	}
})

/**
 * 处理用户触发的操作（快捷键或图标点击）
 * @param {chrome.tabs.Tab} tab - 当前标签页信息
 */
async function querySolution(tab: chrome.tabs.Tab) {
	if (!tab.id) {
		throw new Error('当前标签页ID不存在')
	}
	try {
		// 1. 获取用户配置和登录状态
		const config = await chrome.storage.sync.get([
			'openaiKey',
			'model',
			'language',
			'context'
		])

		// 4. 确保content script已注入
		try {
			await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				files: ['content/index.js']
			})
		} catch (error) {
			console.log('Content script already injected or failed:', error)
		}

		// 5. 获取页面内容
		const response = await chrome.tabs
			.sendMessage(tab.id, {
				action: 'getPageContent'
			})
			.catch(error => {
				throw new Error(`无法与页面 ${tab.id} 通信，请刷新页面重试`)
			})

		if (!response?.success) {
			throw new Error(response?.error || '获取页面内容失败')
		}

		// 6. 构建提示词
		const prompt = DEFAULT_PROMPT_TEMPLATE.replace('{content}', response.body)
			.replace('{language}', getLanguagePrompt(config.language))
			.replace('{context}', config.context || '')

		// 7. 调用 API
		const apiConfig = getApiConfig(config, prompt)

		// // 添加 Google 认证令牌到请求头
		// apiConfig.headers['X-Google-Auth'] = config.googleAuthToken

		const apiResponse = await fetch(apiConfig.endpoint, {
			method: 'POST',
			headers: apiConfig.headers as HeadersInit,
			body: JSON.stringify(apiConfig.body)
		})

		if (!apiResponse.ok) {
			const error = await apiResponse.json()
			throw new Error(error.error?.message || 'API 调用失败')
		}

		// 8. 处理响应
		const result = await apiResponse.json()
		const answer = result.choices[0].message.content

		// 9. 显示结果
		await createAnswerTab(answer)
	} catch (error) {
		console.error('Background script error:', error)
		chrome.notifications.create({
			type: 'basic',
			iconUrl:
				'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
			title: '错误',
			message: (error as Error).message || '发生未知错误'
		})
	}
}

// 获取API配置
function getApiConfig(config: { [key: string]: any }, prompt: string) {
	console.log('API配置:', config)
	return {
		endpoint: 'https://api.openai.com/v1/chat/completions',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${config.openaiKey}`
		},
		body: {
			model: config.model || 'gpt-3.5-turbo',
			messages: [
				{
					role: 'user',
					content: prompt
				}
			]
		}
	}
}

/**
 * 生成结果页面的HTML
 * @param {string} answer - GPT的回答内容
 * @returns {string} HTML字符串
 */
function generateResultHTML(answer: string) {
	return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>算法题解答</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/atom-one-dark.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/4.2.12/marked.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #1a1b1e;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #e6e6e6;
      }

      .container {
        max-width: 860px;
        margin: 0 auto;
        padding: 40px 30px;
        background: #1f2024;
        min-height: 100vh;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
      }

      .markdown-body {
        font-size: 16px;
        line-height: 1.8;
        color: #e6e6e6;
      }

      /* 标题样式 */
      .markdown-body h1,
      .markdown-body h2,
      .markdown-body h3,
      .markdown-body h4,
      .markdown-body h5,
      .markdown-body h6 {
        margin-top: 32px;
        margin-bottom: 16px;
        font-weight: 600;
        line-height: 1.25;
        color: #ffffff;
      }

      .markdown-body h1 {
        font-size: 2em;
        padding-bottom: 0.3em;
        border-bottom: 1px solid #2f3137;
      }

      .markdown-body h2 {
        font-size: 1.5em;
        padding-bottom: 0.3em;
        border-bottom: 1px solid #2f3137;
      }

      .markdown-body h3 { font-size: 1.25em; }
      .markdown-body h4 { font-size: 1em; }

      /* 代码块样式 */
      .markdown-body pre {
        margin: 16px 0;
        padding: 16px;
        overflow: auto;
        background-color: #282c34;
        border-radius: 6px;
        border: 1px solid #3e4451;
      }

      .markdown-body pre code {
        padding: 0;
        margin: 0;
        font-size: 14px;
        font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
        line-height: 1.5;
        color: #abb2bf;
        background: transparent;
      }

      /* 内联代码样式 */
      .markdown-body code {
        padding: 0.2em 0.4em;
        margin: 0;
        font-size: 85%;
        background-color: #282c34;
        border-radius: 3px;
        font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
        color: #e06c75;
      }

      /* 列表样式 */
      .markdown-body ul,
      .markdown-body ol {
        padding-left: 2em;
        margin-top: 0;
        margin-bottom: 16px;
        color: #e6e6e6;
      }

      .markdown-body li {
        margin: 0.25em 0;
      }

      /* 引用块样式 */
      .markdown-body blockquote {
        padding: 0 1em;
        margin: 16px 0;
        color: #b4b4b4;
        border-left: 0.25em solid #3e4451;
        background: #282c34;
      }

      /* 表格样式 */
      .markdown-body table {
        display: block;
        width: 100%;
        overflow: auto;
        margin: 16px 0;
        border-spacing: 0;
        border-collapse: collapse;
      }

      .markdown-body table th,
      .markdown-body table td {
        padding: 6px 13px;
        border: 1px solid #3e4451;
      }

      .markdown-body table tr {
        background-color: #1f2024;
        border-top: 1px solid #3e4451;
      }

      .markdown-body table tr:nth-child(2n) {
        background-color: #282c34;
      }

      /* 分割线样式 */
      .markdown-body hr {
        height: 0.25em;
        padding: 0;
        margin: 24px 0;
        background-color: #3e4451;
        border: 0;
      }

      /* 链接样式 */
      .markdown-body a {
        color: #61afef;
        text-decoration: none;
      }

      .markdown-body a:hover {
        text-decoration: underline;
        color: #528bbc;
      }

      /* 段落样式 */
      .markdown-body p {
        margin-top: 0;
        margin-bottom: 16px;
        color: #e6e6e6;
      }

      /* 强调样式 */
      .markdown-body strong {
        color: #ffffff;
      }

      .markdown-body em {
        color: #e6e6e6;
      }

      /* 代码高亮主题自定义 */
      .hljs {
        background: #282c34;
        color: #abb2bf;
      }
      .hljs-keyword { color: #c678dd; }
      .hljs-string { color: #98c379; }
      .hljs-number { color: #d19a66; }
      .hljs-function { color: #61afef; }
      .hljs-comment { color: #5c6370; font-style: italic; }
      .hljs-title { color: #61afef; }
      .hljs-params { color: #e06c75; }
    </style>
  </head>
  <body>
    <div class="container">
      <article class="markdown-body" id="content"></article>
    </div>
    <script>
      marked.setOptions({
        gfm: true,
        breaks: true,
        highlight: function(code, lang) {
          const language = hljs.getLanguage(lang) ? lang : 'plaintext';
          return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-'
      });

      document.getElementById('content').innerHTML = marked.parse(${JSON.stringify(
				answer
			)});

      document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
      });
    </script>
  </body>
</html>`.trim()
}

/**
 * 创建新标签页显示结果
 * @param {string} answer - GPT的回答内容
 */
async function createAnswerTab(answer: string) {
	try {
		// 创建新窗口
		await chrome.windows.create({
			url: `data:text/html,${encodeURIComponent(generateResultHTML(answer))}`,
			type: 'popup', // 使用popup类型，更适合阅读
			width: 1000, // 设置合适的窗口大小
			height: 800,
			focused: true // 自动聚焦到新窗口
		})
	} catch (error) {
		console.error('Failed to create window:', error)
		// 如果创建窗口失败，回退到创建标签页，自动激活新标签页
		await chrome.tabs.create({
			url: `data:text/html,${encodeURIComponent(generateResultHTML(answer))}`,
			active: true
		})
	}
}

// 添加语言提示词函数
function getLanguagePrompt(lang: string) {
	const prompts = {
		en: 'English',
		zh: '中文',
		ja: '日本語',
		es: 'Español',
		hi: 'हिन्दी'
	}
	return prompts[lang as keyof typeof prompts] || 'English'
}
