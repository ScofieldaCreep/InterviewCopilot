import {
	// Firebase Firestore
	collection,
	doc,
	getDoc,
	getDocs,
	addDoc,
	onSnapshot,
	query,
	where,
	orderBy,
	limit,
	DocumentSnapshot,
  } from 'firebase/firestore'
  import { httpsCallable, HttpsCallableResult } from 'firebase/functions'
  import hljs from 'highlight.js'
  import { marked } from 'marked'
  import { db, functions } from '../firebase-init.js'
  
  // 定义API响应类型
  interface AIResponse {
	answer: string;
  }
  
  /**
   * ============= 工具函数：Markdown 解析 =============
   */
  function parseMarkdown(answer: string) {
	const renderer = new marked.Renderer()
	renderer.code = ({ text, lang = 'plaintext' }: { text: string, lang?: string }) => {
	  const language = hljs.getLanguage(lang) ? lang : 'plaintext'
	  const highlighted = hljs.highlight(text, { language }).value
	  return `<pre><code class="hljs ${language}">${highlighted}</code></pre>`
	}
  
	marked.setOptions({
	  renderer,
	  gfm: true,
	  breaks: true
	})
  
	return marked.parse(answer) as string
  }
  
  /**
   * ============= 工具函数：获取配置项 =============
   */
  async function getApiConfig() {
	const { model, language, context, programmingLanguage } =
	  await chrome.storage.sync.get([
		'model',
		'language',
		'context',
		'programmingLanguage',
	  ])
	return { model, language, context, programmingLanguage }
  }
  
  /**
   * ============= 工具函数：显示错误提示 =============
   */
  async function showErrorMessage(tabId: number, message: string) {
	await chrome.scripting.executeScript({
	  target: { tabId },
	  func: (errorMsg: string) => {
		const style = document.createElement('style')
		style.textContent = `
		  .algo-ace-error {
			position: fixed;
			top: 20px;
			right: 20px;
			background: #ff4d4f;
			color: white;
			padding: 12px 20px;
			border-radius: 4px;
			box-shadow: 0 2px 8px rgba(0,0,0,0.15);
			z-index: 10000;
			animation: slideIn 0.3s ease;
		  }
		  @keyframes slideIn {
			from { transform: translateX(100%); }
			to { transform: translateX(0); }
		  }
		`
		document.head.appendChild(style)

		const div = document.createElement('div')
		div.className = 'algo-ace-error'
		div.textContent = errorMsg
		document.body.appendChild(div)

		setTimeout(() => div.remove(), 3000)
	  },
	  args: [message]
	})
  }
  
  /**
   * ============= 工具函数：调用后端云函数(getAIResponse) =============
   */
  async function callOpenAIThroughBackend(prompt: string, model: string, tabId: number) {
	try {
	  const getOpenAIAnswer = httpsCallable<any, AIResponse>(functions, 'getAIResponse')
	  const response = await getOpenAIAnswer({ prompt, model })
	  return response.data.answer
	} catch (error: any) {
	  await showErrorMessage(tabId, `AI 响应错误: ${error.message || '未知错误'}`)
	  throw error
	}
  }
  
  /**
   * ============= 工具函数：获取当前用户信息(Chrome Sync Storage) =============
   */
  async function getUser() {
	const { user } = await chrome.storage.sync.get('user')
	return user || null
  }
  
  /**
   * ============= 订阅相关：判断用户是否已订阅 =============
   */
  async function hasActiveSubscription(uid: string, tabId: number): Promise<boolean> {
	try {
	  const subscriptionsRef = collection(db, 'customers', uid, 'subscriptions')
	  const activeQuery = query(
		subscriptionsRef,
		where('status', '==', 'active'),
		orderBy('current_period_end', 'desc'),
		limit(1)
	  )
	  const activeSubsSnapshot = await getDocs(activeQuery)
	  if (activeSubsSnapshot.empty) return false
	  const latestSub = activeSubsSnapshot.docs[0].data()
	  const currentPeriodEndMs = latestSub.current_period_end.toMillis()
	  return currentPeriodEndMs > Date.now()
	} catch (error: any) {
	  await showErrorMessage(tabId, `订阅检查失败: ${error.message || '未知错误'}`)
	  throw error
	}
  }
  
  /**
   * ============= 订阅相关：创建checkout session =============
   */
  async function createCheckoutSession(
	uid: string,
	priceId: string,
	userEmail: string,
	tabId: number
  ) {
	try {
	  const checkoutSessionRef = collection(db, 'customers', uid, 'checkout_sessions')
	  const sessionData = {
		price: priceId,
		success_url: 'https://algo-ace-next.vercel.app/',
		cancel_url: 'https://algo-ace-next.vercel.app/',
		mode: 'subscription',
		metadata: { userId: uid, userEmail },
	  }
	  return await addDoc(checkoutSessionRef, sessionData)
	} catch (error: any) {
	  await showErrorMessage(tabId, `创建支付会话失败: ${error.message || '未知错误'}`)
	  throw error
	}
  }
  
  /**
   * ============= 订阅相关：侦听checkout session的实时更新(与subscribe.js逻辑相同) =============
   */
  function listenToCheckoutSession(docRef: any, onData: (data: any) => void) {
	return onSnapshot(docRef, (snap: DocumentSnapshot) => onData(snap.data()))
  }
  
  /**
   * ============= 后台刷新用户数据(已有) =============
   */
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
  
  async function refreshUserData() {
	const user = await getUser()
	if (!user || !user.uid) {
	  return
	}
  
	const hasValidSubscription = await checkPaymentStatus(user.uid)
	const updatedUser = {
	  ...user,
	  hasValidSubscription,
	}
  
	await new Promise<void>((resolve) => {
	  chrome.storage.sync.set({ user: updatedUser }, resolve)
	})
  }
  
  /**
   * ============= 判断用户是否有效订阅或在试用期(已有) =============
   */
  async function isUserSubscriptionValid(user: any) {
	if (!user) return false
	if (user.hasValidSubscription) return true
  
	// 试用期30分钟
	const TRIAL_DURATION = 30 * 60 * 1000
	const now = Date.now()
  
	if (!user.creationTime) {
	  return false
	}
  
	return now - user.creationTime < TRIAL_DURATION
  }
  
  /**
   * ============= 主动注入 content script(已有) =============
   */
  async function injectContentScript(tabId: number) {
	try {
	  await chrome.scripting.executeScript({
		target: { tabId },
		files: ['content/index.js'],
	  })
	} catch (error) {
	  // 忽略可能的重复注入
	}
  }
  
  /**
   * ============= 与前端通信，获取页面内容(已有) =============
   */
  async function fetchPageContent(tabId: number) {
	const response = await chrome.tabs.sendMessage(tabId, {
	  action: 'getPageContent',
	})
	if (!response?.success) {
	  throw new Error(response?.error || 'Failed to get page content')
	}
	return response.body
  }
  
  /**
   * ============= 设置答复语言提示(已有) =============
   */
  function getLanguagePrompt(lang: string) {
	const prompts: { [key: string]: string } = {
	  en: 'English',
	  zh: '中文',
	  ja: '日本語',
	  es: 'Español',
	  hi: 'हिन्दी',
	}
	return prompts[lang] || 'English'
  }
  
  /**
   * ============= 后台弹窗显示最终答案(已有) =============
   */
  async function showAnswer(answer: string) {
	const parsedContent = parseMarkdown(answer)
	const html = generateResultHTML(parsedContent)
	try {
	  // 优先以popup方式打开
	  await chrome.windows.create({
		url: `data:text/html,${encodeURIComponent(html)}`,
		type: 'popup',
		width: 1000,
		height: 800,
		focused: true,
	  })
	} catch {
	  // 如果popup失败，就直接用新Tab打开
	  await chrome.tabs.create({
		url: `data:text/html,${encodeURIComponent(html)}`,
		active: true,
	  })
	}
  }
  
  /**
   * ============= 生成最终HTML(已有) =============
   */
  function generateResultHTML(parsedContent: string) {
	return `
  <!DOCTYPE html>
  <html>
	<head>
	  <meta charset="UTF-8">
	  <title>AlgoAce Solution</title>
	  <link rel="stylesheet" href="${chrome.runtime.getURL('vendor/highlight.min.css')}">
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
		  <!-- 后台已解析好的HTML -->
		  <article class="markdown-body" id="content">${parsedContent}</article>
		</div>
	  </body>
	</html>
	`.trim()
  }
  
  /**
   * ============= 主体函数：查询解决方案 =============
   */
  async function querySolution(tabOrId: number | chrome.tabs.Tab) {
	const tabId = typeof tabOrId === 'number' ? tabOrId : tabOrId.id!
  
	try {
	  const user = await getUser()
	  if (!user) {
		await showErrorMessage(tabId, '请先登录后再使用。')
		return
	  }

	  const validSubscription = await isUserSubscriptionValid(user)
	  if (!validSubscription) {
		await showErrorMessage(tabId, 'Algo Ace试用已结束，请先订阅后再使用。')
		return
	  }

	  const { lastQueryTime, lastContent, lastContentQueryTime } =
		await chrome.storage.sync.get([
		  'lastQueryTime',
		  'lastContent',
		  'lastContentQueryTime',
		])

	  const now = Date.now()

	  if (lastQueryTime && now - lastQueryTime < 15000) {
		await showErrorMessage(tabId, 'Algo Ace：请勿在15秒内重复提交相同请求。')
		return
	  }

	  const { model, language, context, programmingLanguage } = await getApiConfig()

	  await injectContentScript(tabId)
	  const pageContent = await fetchPageContent(tabId)

	  if (
		lastContent === pageContent &&
		lastContentQueryTime &&
		now - lastContentQueryTime < 120000
	  ) {
		await showErrorMessage(tabId, 'Algo Ace：请勿在短时间内提交相同内容。')
		return
	  }

	  await chrome.storage.sync.set({
		lastQueryTime: now,
		lastContent: pageContent,
		lastContentQueryTime: now,
	  })

	  const DEFAULT_PROMPT_TEMPLATE = `
	  请分析以下算法题目，并给出详细解答：
	  {content}

	  要求：
	  1. 使用{language}, 使用markdown格式回答
	  2. 使用{programmingLanguage}语言, 并保持{programmingLanguage}的代码风格
	  3. 分析题目关键点和考察要点
	  4. 给出最优解法的思路和推导过程
	  5. 提供完整的代码实现（包含必要的注释）
	  6. 分析时间和空间复杂度
	  7. 补充其他解法（如果有）
	  {context}
	  `.trim()

	  const prompt = DEFAULT_PROMPT_TEMPLATE
		.replace('{content}', pageContent)
		.replace('{language}', getLanguagePrompt(language))
		.replace('{context}', context || '')
		.replace('{programmingLanguage}', programmingLanguage)

	  const answer = await callOpenAIThroughBackend(prompt, model, tabId)
	  await showAnswer(answer)
	} catch (error: any) {
	  await showErrorMessage(tabId, `处理请求时出错: ${error.message || '未知错误'}`)
	}
  }
  
  /**
   * ============= 后台消息监听(包含订阅逻辑) =============
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'getAnswer' && request.tabId) {
	  querySolution(request.tabId)
		.then(() => sendResponse({ success: true }))
		.catch((error) => {
		  console.error(error)
		  sendResponse({ error: error.message })
		})
	  return true
	}
  
	// 打开登录弹窗
	if (request.action === 'login') {
	  chrome.windows.create(
		{
		  url: 'login.html',
		  type: 'popup',
		  width: 800,
		  height: 600,
		},
		() => sendResponse({ success: true })
	  )
	  return true
	}
  
	// 订阅逻辑：移除subscribe.html后，直接在这里处理
	if (request.action === 'subscribe') {
	  ;(async () => {
		try {
		  // 1. 获取当前用户
		  const user = await getUser()
		  if (!user || !user.uid) {
			sendResponse({ success: false, error: '请先登录再订阅' })
			return
		  }
		  // 2. 检查是否已有有效订阅
		  if (await hasActiveSubscription(user.uid, request.tabId)) {
			sendResponse({ success: false, error: '已拥有有效订阅' })
			return
		  }
		  // 3. 从Firestore获取priceId
		  const configDocRef = doc(db, 'config', 'stripe')
		  const configSnap = await getDoc(configDocRef)
		  if (!configSnap.exists()) {
			sendResponse({ success: false, error: '未找到Stripe配置' })
			return
		  }
		  const PRICE_ID = configSnap.data().priceId_test
  
		  // 4. 创建checkout session
		  const docRef = await createCheckoutSession(user.uid, PRICE_ID, user.email, request.tabId)
  
		  // 5. 监听checkout session, 获取stripe支付链接
		  const unsubscribe = listenToCheckoutSession(docRef, (data) => {
			if (data?.error) {
			  unsubscribe()
			  sendResponse({ success: false, error: data.error.message })
			} else if (data?.url) {
			  unsubscribe()
			  // 后台直接打开Stripe支付页面(新建窗口or标签)
			  chrome.windows.create(
				{
				  url: data.url,
				  type: 'popup',
				  width: 800,
				  height: 600,
				},
				() => {
				  sendResponse({ success: true })
				}
			  )
			}
		  })
		} catch (error: any) {
		  console.error('Subscribe Flow Error:', error)
		  sendResponse({ success: false, error: error.message })
		}
	  })()
	  return true
	}
  
	// 刷新用户数据(已有)
	if (request.action === 'refreshUser') {
	  refreshUserData()
		.then(() => sendResponse({ success: true }))
		.catch((err) => {
		  sendResponse({ success: false, error: err.message })
		})
	  return true
	}
  })
  
  /**
   * 监听图标点击事件，默认触发获取解答
   */
  chrome.action.onClicked.addListener(querySolution)
  
  /**
   * 监听快捷键
   */
  chrome.commands.onCommand.addListener(async (command) => {
	const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
	if (!tab) return
	if (command === '_execute_action') {
	  await chrome.action.openPopup()
	} else if (command === 'get_answer') {
	  await querySolution(tab)
	}
  })