import {
	signInWithCredential,
	GoogleAuthProvider
} from 'firebase/auth/web-extension'
import { collection, query, where, getDocs } from 'firebase/firestore'

import { auth, db } from './firebase-init.js'

document.addEventListener('DOMContentLoaded', async function () {
	const container = document.querySelector('.container')

	const PRICE_AMOUNT = 99900 // 假定支付金额
	const CURRENCY = 'usd'

	// 检查用户支付状态
	async function checkPaymentStatus(userId) {
		console.log('开始检查支付状态...', { userId })
		try {
			// 检查 customers/{userId}/payments
			console.log('检查用户专属支付记录...')
			const paymentsRef = collection(db, 'customers', userId, 'payments')
			console.log('paymentsRef:', paymentsRef)
			const querySnapshot = await getDocs(paymentsRef)
			console.log('用户支付记录数量:', querySnapshot.size)

			for (const docSnap of querySnapshot.docs) {
				const paymentData = docSnap.data()
				console.log('检查支付记录:', paymentData)
				if (
					(paymentData.amount === PRICE_AMOUNT ||
						paymentData.amount === String(PRICE_AMOUNT)) &&
					paymentData.currency === CURRENCY
				) {
					console.log('找到匹配的支付记录!')
					return true
				}
			}

			// todo: 为什么要这样再检查？
			// // 检查 root level payments
			// console.log('检查根级支付记录...')
			// const rootPaymentsRef = collection(db, 'payments')
			// const rootQuery = query(rootPaymentsRef, where('customer', '==', userId))
			// const rootSnapshot = await getDocs(rootQuery)
			// console.log('根级支付记录数量:', rootSnapshot.size)

			// for (const docSnap of rootSnapshot.docs) {
			// 	const paymentData = docSnap.data()
			// 	console.log('检查根级支付记录:', paymentData)
			// 	if (
			// 		(paymentData.amount === PRICE_AMOUNT ||
			// 			paymentData.amount === String(PRICE_AMOUNT)) &&
			// 		paymentData.currency === CURRENCY
			// 	) {
			// 		console.log('找到匹配的根级支付记录!')
			// 		return true
			// 	}
			// }

			console.log('未找到任何匹配的支付记录')
			return false
		} catch (error) {
			console.error('检查支付状态时出错:', error)
			throw error
		}
	}

	function removeCachedToken(callback) {
		chrome.identity.getAuthToken({ interactive: false }, function (token) {
			if (!chrome.runtime.lastError && token) {
				chrome.identity.removeCachedAuthToken({ token: token }, function () {
					callback()
				})
			} else {
				callback()
			}
		})
	}

	chrome.identity.getProfileUserInfo(function (userInfo) {
		if (!userInfo.email) {
			container.innerHTML = `
				<h2>Error</h2>
				<p>Please make sure you're signed into Chrome and sync is enabled.</p>
			`
			return
		}

		function getAuthTokenAndSignIn() {
			console.log('开始获取认证令牌...')
			chrome.identity.getAuthToken(
				{ interactive: true },
				async function (token) {
					if (chrome.runtime.lastError) {
						console.error('获取认证令牌失败:', chrome.runtime.lastError)
						container.innerHTML = `
							<h2>Error</h2>
							<p>Authentication Error: ${chrome.runtime.lastError.message}</p>
						`
						return
					}
					console.log('成功获取认证令牌')

					const credential = GoogleAuthProvider.credential(null, token)
					try {
						console.log('开始 Firebase 认证...')
						const userCredential = await signInWithCredential(auth, credential)
						const user = userCredential.user
						console.log('Firebase 认证成功:', {
							displayName: user.displayName,
							email: user.email,
							uid: user.uid
						})

						const hasPaid = await checkPaymentStatus(user.uid)
						console.log('支付状态检查结果:', hasPaid)

						const userData = {
							name: user.displayName || '',
							email: user.email || '',
							photoURL: user.photoURL || '',
							hasPaid: hasPaid,
							loginTime: Date.now(),
							uid: user.uid
						}

						chrome.storage.sync.set({ user: userData }, () => {
							console.log('用户信息已保存到存储:', userData)
							container.innerHTML = `
								<div style="text-align: center; padding: 20px;">
									<h2 style="color: #4caf50;">✨ 登录成功 ✨</h2>
									<img src="${userData.photoURL || 'default-avatar.png'}" 
										 style="width: 64px; height: 64px; border-radius: 50%; margin: 10px;">
									<p>欢迎回来, ${userData.name}!</p>
									<div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; text-align: left;">
										<h3 style="margin-top: 0;">🚀 使用说明</h3>
										<ul style="padding-left: 20px;">
											<li>当前已开启 30 分钟免打扰模式</li>
											<li>点击扩展图标可查看剩余时间</li>
											<li>在任意网页右键即可使用 AI 助手</li>
										</ul>
									</div>
									<p style="color: #666; font-size: 14px;">窗口将在 5 秒后自动关闭...</p>
								</div>
							`
							console.log('登录流程完成，准备关闭窗口')
							setTimeout(() => window.close(), 5000)
						})
					} catch (error) {
						console.error('Firebase 认证失败:', error)
						if (error.code === 'auth/invalid-credential') {
							removeCachedToken(() => {
								getAuthTokenAndSignIn()
							})
						} else {
							container.innerHTML = `
								<h2>Error</h2>
								<p>Failed to authenticate with Firebase: ${error.message}</p>
							`
						}
					}
				}
			)
		}

		getAuthTokenAndSignIn()
	})
})
