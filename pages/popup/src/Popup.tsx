import React, { useState, useEffect } from 'react'
import './Popup.css'

interface User {
	name: string
	email: string
	photo?: string
	hasValidSubscription: boolean
	creationTime: number
}

interface Option {
	value: string
	label: string
}

/** ================== 基础UI组件 ================== **/

const Button: React.FC<
	React.ButtonHTMLAttributes<HTMLButtonElement> & {
		variant?: 'primary' | 'secondary'
	}
> = ({ variant = 'primary', children, className = '', ...props }) => {
	const baseClass = 'button'
	const variantClass =
		variant === 'primary' ? 'button-primary' : 'button-secondary'
	return (
		<button className={`${baseClass} ${variantClass} ${className}`} {...props}>
			{children}
		</button>
	)
}

const Select: React.FC<
	React.SelectHTMLAttributes<HTMLSelectElement> & { options: Option[] }
> = ({ options, ...props }) => (
	<select {...props}>
		{options.map(option => (
			<option key={option.value} value={option.value}>
				{option.label}
			</option>
		))}
	</select>
)

const ConfigItem: React.FC<{ label: string }> = ({ label, children }) => (
	<div className='config-item'>
		<label>{label}</label>
		{children}
	</div>
)

const UserInfo: React.FC<{ user: User; onLogout: () => void }> = ({
	user,
	onLogout
}) => (
	<div className='user-card compact'>
		<img
			src={user.photo || 'default-avatar.png'}
			alt={user.name}
			className='user-avatar small'
		/>
		<div className='user-details'>
			<h2 className='user-name'>{user.name}</h2>
			<p className='user-email'>{user.email}</p>
		</div>
		<Button
			variant='secondary'
			onClick={onLogout}
			className='logout-button compact'
		>
			Logout
		</Button>
	</div>
)

const ShortcutHint: React.FC = () => (
	<div className='shortcut-hint'>
		<div className='shortcut-item'>
			<span>Open Settings:</span>
			<span className='shortcut-key'>Alt + Shift + Y</span>
		</div>
		<div className='shortcut-item'>
			<span>Quick Solution:</span>
			<span className='shortcut-key'>Alt + Q</span>
		</div>
	</div>
)

const Header: React.FC = () => (
	<header className='header'>
		<h1 className='title'>Interview Copilot</h1>
		<p className='subtitle'>AI-powered algorithm solution assistant</p>
	</header>
)

const LoginSection: React.FC<{ onLogin: () => void }> = ({ onLogin }) => (
	<div className='login-section'>
		<p style={{ marginBottom: '10px' }}>
			Login with Google to enjoy a 30-minute unlimited AI solution trial!
		</p>
		<Button variant='primary' onClick={onLogin}>
			Login with Google
		</Button>
	</div>
)

/** ================== 合并后的统一用户面板组件 ================== **/
const UserDashboard: React.FC<{
	user: User
	onLogout: () => void
	model: string
	setModel: React.Dispatch<React.SetStateAction<string>>
	language: string
	setLanguage: React.Dispatch<React.SetStateAction<string>>
	context: string
	setContext: React.Dispatch<React.SetStateAction<string>>
	remainingTime: number
	onGetSolution: () => void
	onSubscribe: () => void
}> = ({
	user,
	onLogout,
	model,
	setModel,
	language,
	setLanguage,
	context,
	setContext,
	remainingTime,
	onGetSolution,
	onSubscribe
}) => {
	const inTrial = !user.hasValidSubscription && remainingTime > 0
	const trialTimeLeft = inTrial
		? `${Math.floor(remainingTime / 60000)}m ${Math.floor((remainingTime % 60000) / 1000)}s`
		: ''

	return (
		<>
			<UserInfo user={user} onLogout={onLogout} />

			<ConfigItem label='Model'>
				<Select
					id='model'
					value={model}
					onChange={e => setModel(e.target.value)}
					options={[
						{ value: 'gpt-3.5-turbo', label: 'Swift' },
						{ value: 'gpt-4o', label: 'Accurate' },
						{ value: 'o1-mini', label: 'Monster' }
					]}
				/>
			</ConfigItem>

			<ConfigItem label='Response Language'>
				<Select
					id='language'
					value={language}
					onChange={e => setLanguage(e.target.value)}
					options={[
						{ value: 'en', label: 'English' },
						{ value: 'zh', label: 'Chinese (中文)' },
						{ value: 'ja', label: 'Japanese (日本語)' },
						{ value: 'es', label: 'Spanish (Español)' },
						{ value: 'hi', label: 'Hindi (हिन्दी)' }
					]}
				/>
			</ConfigItem>

			<ConfigItem label='Custom Prompt (Optional)'>
				<textarea
					id='context'
					rows={3}
					placeholder='Add custom instructions to the AI...'
					value={context}
					onChange={e => setContext(e.target.value)}
				/>
			</ConfigItem>

			{user.hasValidSubscription ? (
				// 已订阅用户
				<>
					<Button
						variant='secondary'
						onClick={onGetSolution}
						className='full-width-button'
					>
						Get Solution
					</Button>
					<ShortcutHint />
				</>
			) : inTrial ? (
				// 未订阅且处于试用期内
				<div className='trial-section'>
					<p>Your free trial is ongoing. Remaining time: {trialTimeLeft}</p>
					<Button
						variant='secondary'
						onClick={onGetSolution}
						className='full-width-button'
					>
						Get Solution
					</Button>
					<Button
						variant='primary'
						onClick={onSubscribe}
						className='full-width-button'
					>
						Subscribe Now
					</Button>
					<Button
						variant='secondary'
						onClick={onLogout}
						className='full-width-button'
					>
						Logout
					</Button>
				</div>
			) : (
				// 未订阅且试用期已结束
				<div className='expired-section'>
					<p>
						Your free trial has ended. Please subscribe to continue using the
						solution feature.
					</p>
					<Button
						variant='primary'
						onClick={onSubscribe}
						className='full-width-button'
					>
						Subscribe Now
					</Button>
					<Button
						variant='secondary'
						onClick={onLogout}
						className='full-width-button'
					>
						Logout
					</Button>
				</div>
			)}
		</>
	)
}

/** ================== 后台交互逻辑函数 ================== **/

async function handleGetSolutionAction(
	model: string,
	language: string,
	context: string
) {
	await new Promise<void>(resolve => {
		chrome.storage.sync.set({ model, language, context }, resolve)
	})
	chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
		const tab = tabs[0]
		if (tab && tab.id) {
			chrome.runtime
				.sendMessage({ action: 'getAnswer', tabId: tab.id })
				.then(response => {
					if (response?.error) {
						console.error('获取答案错误:', response.error)
					} else {
						console.log('答案获取成功')
					}
				})
				.catch(error => {
					console.error('消息发送失败:', error)
				})
		} else {
			console.error('无效的标签页')
		}
	})
}

function handleLoginAction() {
	chrome.runtime.sendMessage({ action: 'login' }, response => {
		if (response && response.success) {
			console.log('登录窗口已打开，请在弹出的窗口中完成登录。')
		} else {
			console.error('登录失败', response?.error)
		}
	})
}

function handleLogoutAction(
	setUser: React.Dispatch<React.SetStateAction<User | null>>
) {
	chrome.storage.sync.remove('user', () => {
		if (chrome.runtime.lastError) {
			console.error('登出失败:', chrome.runtime.lastError)
		} else {
			setUser(null)
			console.log('用户已成功注销')
		}
	})
}

function handleSubscribeAction() {
	chrome.runtime.sendMessage({ action: 'subscribe' }, response => {
		console.log('订阅响应:', response)
	})
}

/** ================== 主组件 ================== **/

const Popup: React.FC = () => {
	const [model, setModel] = useState('gpt-3.5-turbo')
	const [language, setLanguage] = useState('en')
	const [context, setContext] = useState('')
	const [user, setUser] = useState<User | null>(null)
	const [remainingTime, setRemainingTime] = useState<number>(0)

	// 初始化数据
	useEffect(() => {
		chrome.storage.sync.get(['model', 'language', 'context', 'user'], data => {
			if (data.model) setModel(data.model)
			if (data.language) setLanguage(data.language)
			if (data.context) setContext(data.context)
			if (data.user) {
				setUser({
					name: data.user.name,
					email: data.user.email,
					photo: data.user.photoURL,
					hasValidSubscription: data.user.hasValidSubscription,
					creationTime: data.user.creationTime
				})
			}
		})
	}, [])

	// 监听storage变化
	useEffect(() => {
		function handleStorageChange(changes: {
			[key: string]: chrome.storage.StorageChange
		}) {
			if (changes.user && changes.user.newValue) {
				setUser({
					name: changes.user.newValue.name,
					email: changes.user.newValue.email,
					photo: changes.user.newValue.photoURL,
					hasValidSubscription: changes.user.newValue.hasValidSubscription,
					creationTime: changes.user.newValue.creationTime
				})
			}
		}
		chrome.storage.onChanged.addListener(handleStorageChange)
		return () => {
			chrome.storage.onChanged.removeListener(handleStorageChange)
		}
	}, [])

	useEffect(() => {
		chrome.storage.sync.set({ model, language, context }, () => {
			if (chrome.runtime.lastError) {
				console.error('Failed to save config:', chrome.runtime.lastError)
			} else {
				console.log('Config saved:', { model, language, context })
			}
		})
	}, [model, language, context])

	// 使用 creationTime 来计算试用剩余时间
	useEffect(() => {
		if (user && !user.hasValidSubscription) {
			const TRIAL_DURATION = 30 * 60 * 1000
			const updateRemaining = () => {
				const elapsed = Date.now() - user.creationTime
				const remain = TRIAL_DURATION - elapsed
				setRemainingTime(remain > 0 ? remain : 0)
			}
			updateRemaining()
			const intervalId = setInterval(updateRemaining, 1000)
			return () => clearInterval(intervalId)
		} else {
			setRemainingTime(0)
		}
	}, [user])

	const handleGetSolution = () =>
		handleGetSolutionAction(model, language, context)
	const handleLogin = () => handleLoginAction()
	const handleLogout = () => handleLogoutAction(setUser)
	const handleSubscribe = () => handleSubscribeAction()

	let content
	if (!user) {
		content = <LoginSection onLogin={handleLogin} />
	} else {
		content = (
			<UserDashboard
				user={user}
				onLogout={handleLogout}
				model={model}
				setModel={setModel}
				language={language}
				setLanguage={setLanguage}
				context={context}
				setContext={setContext}
				remainingTime={remainingTime}
				onGetSolution={handleGetSolution}
				onSubscribe={handleSubscribe}
			/>
		)
	}

	return (
		<div className='popup-container'>
			<Header />
			{content}
		</div>
	)
}

export default Popup
