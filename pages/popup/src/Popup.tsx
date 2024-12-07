import React, { useState, useEffect } from 'react'
import './Popup.css'

// 类型定义
interface User {
	name: string
	email: string
	photo?: string
	hasPaid: boolean
	loginTime: number
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'primary' | 'secondary'
}

interface Option {
	value: string
	label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
	options: Option[]
}

// 子组件

// 按钮组件
const Button: React.FC<ButtonProps> = ({
	variant = 'primary',
	children,
	className = '',
	...props
}) => {
	const baseClass = 'button'
	const variantClass =
		variant === 'primary' ? 'button-primary' : 'button-secondary'

	return (
		<button className={`${baseClass} ${variantClass} ${className}`} {...props}>
			{children}
		</button>
	)
}

// 下拉选择组件
const Select: React.FC<SelectProps> = ({ options, ...props }) => {
	return (
		<select {...props}>
			{options.map(option => (
				<option key={option.value} value={option.value}>
					{option.label}
				</option>
			))}
		</select>
	)
}

// 用户信息组件（更新后的）
const UserInfo: React.FC<{ user: User; onLogout: () => void }> = ({
	user,
	onLogout
}) => {
	return (
		<div className='user-card compact'>
			<img src={user.photo} alt={user.name} className='user-avatar small' />
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
}

// 配置项组件
const ConfigItem: React.FC<{ label: string; children: React.ReactNode }> = ({
	label,
	children
}) => {
	return (
		<div className='config-item'>
			<label>{label}</label>
			{children}
		</div>
	)
}

// 快捷提示组件
const ShortcutHint: React.FC = () => {
	return (
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
}

// 试用期组件
const TrialSection: React.FC<{
	timeLeft: string
	onGetSolution: () => void
	onSubscribe: () => void
	onLogout: () => void
}> = ({ timeLeft, onGetSolution, onSubscribe, onLogout }) => {
	return (
		<div className='trial-section'>
			<p>您的免费试用正在进行。剩余时间：{timeLeft}</p>
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
				立即订阅
			</Button>
			<Button
				variant='secondary'
				onClick={onLogout}
				className='full-width-button'
			>
				Logout
			</Button>
		</div>
	)
}

// 试用期结束组件
const ExpiredSection: React.FC<{
	onSubscribe: () => void
	onLogout: () => void
}> = ({ onSubscribe, onLogout }) => {
	return (
		<div className='expired-section'>
			<p>您的免费试用已结束。请订阅以继续使用解答功能。</p>
			<Button
				variant='primary'
				onClick={onSubscribe}
				className='full-width-button'
			>
				立即订阅
			</Button>
			<Button
				variant='secondary'
				onClick={onLogout}
				className='full-width-button'
			>
				Logout
			</Button>
		</div>
	)
}

// API Key 输入组件
const APIKeyInputs: React.FC<{
	openaiKey: string
	setOpenaiKey: React.Dispatch<React.SetStateAction<string>>
}> = ({ openaiKey, setOpenaiKey }) => {
	return (
		<ConfigItem label='OpenAI API Key'>
			<input
				type='password'
				id='openaiKey'
				placeholder='sk-...'
				value={openaiKey}
				onChange={e => setOpenaiKey(e.target.value)}
			/>
		</ConfigItem>
	)
}

// 主组件
const Popup: React.FC = () => {
	// 定义状态
	const [model, setModel] = useState('gpt-3.5-turbo')
	const [language, setLanguage] = useState('en')
	const [context, setContext] = useState('')
	const [openaiKey, setOpenaiKey] = useState('')
	const [user, setUser] = useState<User | null>(null)
	const [remainingTime, setRemainingTime] = useState<number | null>(null)

	// 组件挂载时，从 chrome.storage.sync 获取初始数据
	useEffect(() => {
		chrome.storage.sync.get(
			['openaiKey', 'model', 'language', 'context', 'user'],
			data => {
				if (data.openaiKey) setOpenaiKey(data.openaiKey)
				if (data.model) setModel(data.model)
				if (data.language) setLanguage(data.language)
				if (data.context) setContext(data.context)

				if (data.user) {
					setUser({
						name: data.user.name,
						email: data.user.email,
						photo: data.user.photoURL,
						hasPaid: data.user.hasPaid,
						loginTime: data.user.loginTime
					})
				}
			}
		)
	}, [])

	// 当 openaiKey, model, language, context 发生变化时，保存到 chrome.storage.sync
	useEffect(() => {
		chrome.storage.sync.set({ openaiKey, model, language, context }, () => {
			if (chrome.runtime.lastError) {
				console.error('保存错误:', chrome.runtime.lastError)
			}
		})
	}, [openaiKey, model, language, context])

	// 监听 chrome.storage.onChanged 事件，更新用户信息
	useEffect(() => {
		function handleStorageChange(changes: {
			[key: string]: chrome.storage.StorageChange
		}) {
			if (changes.user && changes.user.newValue) {
				setUser({
					name: changes.user.newValue.name,
					email: changes.user.newValue.email,
					photo: changes.user.newValue.photoURL,
					hasPaid: changes.user.newValue.hasPaid,
					loginTime: changes.user.newValue.loginTime
				})
			}
		}
		chrome.storage.onChanged.addListener(handleStorageChange)
		return () => {
			chrome.storage.onChanged.removeListener(handleStorageChange)
		}
	}, [])

	// 倒计时逻辑（仅在用户存在但未订阅时执行）
	useEffect(() => {
		if (user && !user.hasPaid) {
			const TRIAL_DURATION = 30 * 60 * 1000 // 30分钟
			const updateRemaining = () => {
				const elapsed = Date.now() - user.loginTime
				const remain = TRIAL_DURATION - elapsed
				setRemainingTime(remain > 0 ? remain : 0)
			}
			updateRemaining()
			const intervalId = setInterval(updateRemaining, 1000)
			return () => clearInterval(intervalId)
		}
	}, [user])

	// 处理保存操作
	const handleSave = () => {
		chrome.storage.sync.set({ openaiKey, model, language, context }, () => {
			if (chrome.runtime.lastError) {
				console.error('保存错误:', chrome.runtime.lastError)
			} else {
				console.log('设置保存完成')
			}
		})
	}

	// 处理获取解答的操作
	const handleGetSolution = async () => {
		if (!openaiKey) {
			alert('请先配置 OpenAI API key')
			return
		}

		try {
			await handleSave()
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
		} catch (error) {
			console.error('操作失败:', error)
		}
	}

	// 处理登录操作
	const handleLogin = () => {
		chrome.runtime.sendMessage({ action: 'login' }, response => {
			if (response && response.success) {
				console.log('登录窗口已打开，请在弹出的窗口中完成登录。')
			} else {
				console.error('登录失败', response?.error)
			}
		})
	}

	// 处理登出操作
	const handleLogout = () => {
		chrome.storage.sync.remove('user', () => {
			if (chrome.runtime.lastError) {
				console.error('登出失败:', chrome.runtime.lastError)
			} else {
				setUser(null)
				console.log('用户已成功注销')
			}
		})
	}

	// 处理订阅操作
	const handleSubscribe = () => {
		chrome.runtime.sendMessage({ action: 'subscribe' }, response => {
			console.log('订阅响应:', response)
		})
	}

	// 根据用户状态动态渲染内容
	let content
	if (!user) {
		// 未登录
		content = (
			<div className='login-section'>
				<p style={{ marginBottom: '10px' }}>
					使用 Google 登录，享受30分钟不限次数的AI解答免费试用！
				</p>
				<Button variant='primary' onClick={handleLogin}>
					使用 Google 登录
				</Button>
			</div>
		)
	} else if (user.hasPaid) {
		// 已订阅用户
		content = (
			<>
				<UserInfo user={user} onLogout={handleLogout} />

				<ConfigItem label='Model'>
					<Select
						id='model'
						value={model}
						onChange={e => setModel(e.target.value)}
						options={[
							{ value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
							{ value: 'o1-mini', label: 'O1 Mini' },
							{ value: 'gpt-4o', label: 'GPT-4 O' }
						]}
					/>
				</ConfigItem>

				<APIKeyInputs openaiKey={openaiKey} setOpenaiKey={setOpenaiKey} />

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
						placeholder='为 AI 添加自定义指令...'
						value={context}
						onChange={e => setContext(e.target.value)}
					/>
				</ConfigItem>

				<Button
					variant='secondary'
					onClick={handleGetSolution}
					className='full-width-button'
				>
					Get Solution
				</Button>

				<ShortcutHint />
			</>
		)
	} else {
		// 未订阅用户
		const remain = remainingTime !== null ? remainingTime : 0
		const inTrial = remain > 0

		// 格式化剩余时间
		let timeLeft = ''
		if (inTrial) {
			const minutes = Math.floor(remain / 60000)
			const seconds = Math.floor((remain % 60000) / 1000)
			timeLeft = `${minutes}m ${seconds}s`
		}

		content = (
			<>
				<UserInfo user={user} onLogout={handleLogout} />

				<ConfigItem label='Model'>
					<Select
						id='model'
						value={model}
						onChange={e => setModel(e.target.value)}
						options={[
							{ value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
							{ value: 'o1-mini', label: 'O1 Mini' },
							{ value: 'gpt-4o', label: 'GPT-4 O' }
						]}
					/>
				</ConfigItem>

				<APIKeyInputs openaiKey={openaiKey} setOpenaiKey={setOpenaiKey} />

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
						placeholder='为 AI 添加自定义指令...'
						value={context}
						onChange={e => setContext(e.target.value)}
					/>
				</ConfigItem>

				{/* 根据试用期状态渲染对应的内容 */}
				{inTrial ? (
					<TrialSection
						timeLeft={timeLeft}
						onGetSolution={handleGetSolution}
						onSubscribe={handleSubscribe}
						onLogout={handleLogout}
					/>
				) : (
					<ExpiredSection
						onSubscribe={handleSubscribe}
						onLogout={handleLogout}
					/>
				)}

				<ShortcutHint />
			</>
		)
	}

	return (
		<div className='popup-container'>
			<header className='header'>
				<h1 className='title'>Interview Copilot</h1>
				<p className='subtitle'>AI-powered algorithm solution assistant</p>
			</header>
			{content}
		</div>
	)
}

export default Popup
