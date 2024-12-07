import React, { useState, useEffect } from 'react'
import './Popup.css'
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared'
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { initializeApp } from 'firebase/app'

// 类型定义
interface User {
	name: string
	email: string
	photo: string
	token: string
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

const APIKeyInputs: React.FC<{
	model: string
	openaiKey: string
	setOpenaiKey: React.Dispatch<React.SetStateAction<string>>
}> = ({ model, openaiKey, setOpenaiKey }) => {
	return (
		<div className='api-keys'>
			<div className={`api-key-item`} id='openaiKeyItem'>
				<label htmlFor='openaiKey'>OpenAI API Key</label>
				<input
					type='password'
					id='openaiKey'
					placeholder='sk-...'
					value={openaiKey}
					onChange={e => setOpenaiKey(e.target.value)}
				/>
			</div>
		</div>
	)
}

// 主组件
const Popup: React.FC = () => {
	const [model, setModel] = useState('gpt-3.5-turbo')
	const [language, setLanguage] = useState('en')
	const [context, setContext] = useState('')
	const [openaiKey, setOpenaiKey] = useState('')

	// 1. 初始化加载 - 只执行一次
	useEffect(() => {
		console.group('初始化状态加载')
		chrome.storage.sync.get(
			['openaiKey', 'model', 'language', 'context'],
			data => {
				if (data.openaiKey) setOpenaiKey(data.openaiKey)
				if (data.model) setModel(data.model)
				if (data.language) setLanguage(data.language)
				if (data.context) setContext(data.context)
			}
		)
		console.groupEnd()
	}, []) // 空依赖数组

	// 2. 监听表单变化并自动保存
	useEffect(() => {
		console.group('自动保存设置')
		chrome.storage.sync.set({ openaiKey, model, language, context }, () => {
			if (chrome.runtime.lastError) {
				console.error('保存错误:', chrome.runtime.lastError)
			}
		})
		console.groupEnd()
	}, [openaiKey, model, language, context]) // 监听所有表单字段

	// 保存设置调试
	const handleSave = () => {
		console.group('保存设置')
		console.log('待保存的配置:', {
			openaiKey: openaiKey ? '已设置' : '未设置',
			model,
			language,
			context: context ? '已设置' : '未设置'
		})

		chrome.storage.sync.set(
			{
				openaiKey,
				model,
				language,
				context
			},
			() => {
				console.log('设置保存完成')
				if (chrome.runtime.lastError) {
					console.error('保存错误:', chrome.runtime.lastError)
				}
			}
		)
		console.groupEnd()
	}

	// 获取答案调试
	const handleGetSolution = async () => {
		if (!openaiKey) {
			alert('请先配置 OpenAI API key')
			return
		}

		console.group('获取答案')
		try {
			// 先保存设置
			await handleSave()

			// 获取答案的逻辑
			chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
				const tab = tabs[0]
				console.log('当前标签页:', tab)

				if (tab && tab.id) {
					console.log('发送获取答案请求, tabId:', tab.id)
					chrome.runtime
						.sendMessage({ action: 'getAnswer', tabId: tab.id })
						.then(response => {
							console.log('获取答案响应:', response)
							if (response?.error) {
								console.error('获取答案错误:', response.error)
							} else {
								console.log('答案获取成功')
							}
						})
						.catch(error => {
							console.error('消息发送失败:', error)
							console.error('错误详情:', error.stack)
						})
				} else {
					console.error('无效的标签页')
				}
			})
		} catch (error) {
			console.error('操作失败:', error)
		} finally {
			console.groupEnd()
		}
	}

	return (
		<div className='popup-container'>
			<header className='header'>
				<h1 className='title'>Interview Copilot</h1>
				<p className='subtitle'>AI-powered algorithm solution assistant</p>
			</header>

			<div className='config-item'>
				<label htmlFor='model'>Model</label>
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
			</div>

			<APIKeyInputs
				model={model}
				openaiKey={openaiKey}
				setOpenaiKey={setOpenaiKey}
			/>

			<div className='config-item'>
				<label htmlFor='language'>Response Language</label>
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
			</div>

			<div className='config-item'>
				<label htmlFor='context'>Custom Prompt (Optional)</label>
				<textarea
					id='context'
					rows={3}
					placeholder='Add custom instructions for the AI...'
					value={context}
					onChange={e => setContext(e.target.value)}
				/>
			</div>

			<div className='button-group'>
				<Button variant='secondary' onClick={handleGetSolution}>
					Get Solution
				</Button>
			</div>

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
		</div>
	)
}

export default withErrorBoundary(
	withSuspense(Popup, <div>Loading...</div>),
	<div>Error Occurred</div>
)
