// index.ts - 后台逻辑
import { db, functions } from './firebase-init.js'
import { httpsCallable } from 'firebase/functions'
import {
	collection,
	getDocs,
	query,
	where,
	orderBy,
	limit
} from 'firebase/firestore'

// 获取用户配置
async function getApiConfig() {
	const { model, language, context } = await chrome.storage.sync.get([
		'model',
		'language',
		'context'
	])
	return { model, language, context }
}

// 调用后端函数获取回答
async function callOpenAIThroughBackend(prompt: string, model: string) {
	const getOpenAIAnswer = httpsCallable(functions, 'getAIResponse')
	const response = await getOpenAIAnswer({ prompt, model })
	return response.data.answer
}

// 获取用户数据
async function getUser() {
	const { user } = await chrome.storage.sync.get('user')
	return user || null
}

// 检查订阅状态
async function checkPaymentStatus(userId: string): Promise<boolean> {
	const paymentsRef = collection(db, 'customers', userId, 'subscriptions')
	const q = query(
		paymentsRef,
		where('status', '==', 'active'),
		orderBy('current_period_end', 'desc'),
		limit(1)
	)
	const snapshot = await getDocs(q)
	if (snapshot.empty) return false
	const data = snapshot.docs[0].data()
	const currentPeriodEndMs = data.current_period_end.toMillis()
	return currentPeriodEndMs > Date.now()
}

// 刷新用户数据
async function refreshUserData() {
	const user = await getUser()
	if (!user || !user.uid) {
		console.error('No user found in storage, cannot refresh user data.')
		return
	}

	const hasValidSubscription = await checkPaymentStatus(user.uid)
	const updatedUser = {
		...user,
		hasValidSubscription
	}

	await new Promise<void>(resolve => {
		chrome.storage.sync.set({ user: updatedUser }, resolve)
	})
	console.log('User data refreshed:', updatedUser)
}

async function isUserSubscriptionValid(user) {
	if (!user) return false
	if (user.hasValidSubscription) return true

	// 试用期30分钟
	const TRIAL_DURATION = 30 * 60 * 1000
	const now = Date.now()
	return user.loginTime && now - user.loginTime < TRIAL_DURATION
}

async function injectContentScript(tabId: number) {
	try {
		await chrome.scripting.executeScript({
			target: { tabId },
			files: ['content/index.js']
		})
	} catch (error) {
		console.log(
			'Content script injection error (maybe already injected):',
			error
		)
	}
}

async function fetchPageContent(tabId: number) {
	const response = await chrome.tabs.sendMessage(tabId, {
		action: 'getPageContent'
	})
	if (!response?.success) {
		throw new Error(response?.error || 'Failed to get page content')
	}
	return response.body
}

function getLanguagePrompt(lang: string) {
	const prompts: { [key: string]: string } = {
		en: 'English',
		zh: '中文',
		ja: '日本語',
		es: 'Español',
		hi: 'हिन्दी'
	}
	return prompts[lang] || 'English'
}

async function showAnswer(answer: string) {
	const html = generateResultHTML(answer)
	try {
		await chrome.windows.create({
			url: `data:text/html,${encodeURIComponent(html)}`,
			type: 'popup',
			width: 1000,
			height: 800,
			focused: true
		})
	} catch {
		await chrome.tabs.create({
			url: `data:text/html,${encodeURIComponent(html)}`,
			active: true
		})
	}
}

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

      .markdown-body code {
        padding: 0.2em 0.4em;
        margin: 0;
        font-size: 85%;
        background-color: #282c34;
        border-radius: 3px;
        font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
        color: #e06c75;
      }

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

      .markdown-body blockquote {
        padding: 0 1em;
        margin: 16px 0;
        color: #b4b4b4;
        border-left: 0.25em solid #3e4451;
        background: #282c34;
      }

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

      .markdown-body hr {
        height: 0.25em;
        padding: 0;
        margin: 24px 0;
        background-color: #3e4451;
        border: 0;
      }

      .markdown-body a {
        color: #61afef;
        text-decoration: none;
      }

      .markdown-body a:hover {
        text-decoration: underline;
        color: #528bbc;
      }

      .markdown-body p {
        margin-top: 0;
        margin-bottom: 16px;
        color: #e6e6e6;
      }

      .markdown-body strong {
        color: #ffffff;
      }

      .markdown-body em {
        color: #e6e6e6;
      }

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

async function querySolution(tabOrId) {
	const tabId = typeof tabOrId === 'number' ? tabOrId : tabOrId.id
	const user = await getUser()
	const validSubscription = await isUserSubscriptionValid(user)
	if (!user) throw new Error('Please login first.')
	if (!validSubscription) throw new Error('Trial expired. Please subscribe.')

	const { model, language, context } = await getApiConfig()

	await injectContentScript(tabId)
	const pageContent = await fetchPageContent(tabId)

	const DEFAULT_PROMPT_TEMPLATE = `
    请分析以下算法题目，并给出详细解答：
    {content}
  
    要求：
    1. 使用{language}, 使用markdown格式回答
    2. 使用Python3语言, 并保持Python3的代码风格
    3. 分析题目关键点和考察要点
    4. 给出最优解法的思路和推导过程
    5. 提供完整的代码实现（包含必要的注释）
    6. 分析时间和空间复杂度
    7. 补充其他解法（如果有）
    {context}
  `.trim()

	const prompt = DEFAULT_PROMPT_TEMPLATE.replace('{content}', pageContent)
		.replace('{language}', getLanguagePrompt(language))
		.replace('{context}', context || '')

	const answer = await callOpenAIThroughBackend(prompt, model)
	await showAnswer(answer)
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'getAnswer' && request.tabId) {
		querySolution(request.tabId)
			.then(() => sendResponse({ success: true }))
			.catch(error => {
				console.error(error)
				sendResponse({ error: error.message })
			})
		return true
	}

	if (request.action === 'login') {
		chrome.windows.create(
			{
				url: 'login/index.html',
				type: 'popup',
				width: 800,
				height: 600
			},
			() => sendResponse({ success: true })
		)
		return true
	}

	if (request.action === 'subscribe') {
		chrome.windows.create(
			{
				url: 'subscribe/index.html',
				type: 'popup',
				width: 800,
				height: 600
			},
			() => sendResponse({ success: true })
		)
		return true
	}

	if (request.action === 'refreshUser') {
		refreshUserData()
			.then(() => sendResponse({ success: true }))
			.catch(err => {
				console.error('Failed to refresh user data:', err)
				sendResponse({ success: false, error: err.message })
			})
		return true
	}
})

chrome.action.onClicked.addListener(querySolution)

chrome.commands.onCommand.addListener(async command => {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
	if (!tab) return
	if (command === '_execute_action') {
		await chrome.action.openPopup()
	} else if (command === 'get_answer') {
		await querySolution(tab)
	}
})
