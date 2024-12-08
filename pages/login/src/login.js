// login.js

import {
	signInWithCredential,
	GoogleAuthProvider
} from 'firebase/auth/web-extension'
import {
	collection,
	getDocs,
	query,
	where,
	orderBy,
	limit
} from 'firebase/firestore'
import { auth, db } from './firebase-init.js'

function getAuthToken() {
	return new Promise((resolve, reject) => {
		chrome.identity.getAuthToken({ interactive: true }, token => {
			if (chrome.runtime.lastError || !token) {
				return reject(
					new Error(chrome.runtime.lastError?.message || 'Failed to get token')
				)
			}
			resolve(token)
		})
	})
}

async function firebaseSignInWithToken(token) {
	const credential = GoogleAuthProvider.credential(null, token)
	const userCredential = await signInWithCredential(auth, credential)
	return userCredential.user
}

// 若后续需要考虑用户多订阅场景，可在后端确保一个用户同一时间点仅有一个active订阅
async function checkPaymentStatus(userId) {
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

function saveUserData(userData) {
	return new Promise(resolve => {
		chrome.storage.sync.set({ user: userData }, resolve)
	})
}

function showError(container, message) {
	container.innerHTML = `
	  <h2>Error</h2>
	  <p>${message}</p>
	`
}

function showSuccess(container, userData, hasValidSubscription) {
	container.innerHTML = `
	  <div style="text-align: center; padding: 20px;">
		<h2 style="color: #4caf50;">✨ 登录成功 ✨</h2>
		<img src="${userData.photoURL || 'default-avatar.png'}" 
			 style="width: 64px; height: 64px; border-radius: 50%; margin: 10px;">
		<p>欢迎回来, ${userData.name}!</p>
		<p>您现在的订阅状态：${hasValidSubscription ? '已订阅' : '试用期'}</p>
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
}

document.addEventListener('DOMContentLoaded', async function () {
	const container = document.querySelector('.container')

	try {
		const token = await getAuthToken()
		const firebaseUser = await firebaseSignInWithToken(token)
		const hasValidSubscription = await checkPaymentStatus(firebaseUser.uid)

		const userData = {
			name: firebaseUser.displayName || '',
			email: firebaseUser.email || '',
			photoURL: firebaseUser.photoURL || '',
			hasValidSubscription,
			loginTime: Date.now(),
			uid: firebaseUser.uid
		}

		await saveUserData(userData)
		showSuccess(container, userData, hasValidSubscription)
		setTimeout(() => window.close(), 5000)
	} catch (error) {
		showError(container, error.message)
	}
})
