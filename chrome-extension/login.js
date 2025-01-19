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
import { auth, db } from './src/firebase-init.js'

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
		<h2 style="color: #4caf50;">✨ Login Success ✨</h2>
		<img src="${userData.photoURL || 'default-avatar.png'}" 
			 style="width: 64px; height: 64px; border-radius: 50%; margin: 10px;">
		<p>Welcome back, ${userData.name}!</p>
		<p>Your current subscription status: ${hasValidSubscription ? 'Subscribed' : 'Trial Period'}</p>
		<div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; text-align: left;">
		  <h3 style="margin-top: 0;">🚀 Usage Instructions</h3>
		  <ul style="padding-left: 20px;">
			<li>You have a 30-minute free trial period</li>
			<li>Click the extension icon to view remaining time</li>
			<li>Right-click on any webpage to use the AI assistant</li>
		  </ul>
		</div>
		<p style="color: #666; font-size: 14px;">The window will close automatically in 5 seconds...</p>
	  </div>
	`
}

document.addEventListener('DOMContentLoaded', async function () {
	const container = document.querySelector('.container')

	try {
		const token = await getAuthToken()
		const firebaseUser = await firebaseSignInWithToken(token)
		const uid = firebaseUser.uid
		const hasValidSubscription = await checkPaymentStatus(uid)

		// 从 firebaseUser 中获取创建时间并转为时间戳
		const creationTime = firebaseUser.metadata.creationTime // 类似 "Mon, 07 Dec 2024 10:00:00 GMT"
		const creationTimestamp = new Date(creationTime).getTime()

		const userData = {
			uid: firebaseUser.uid,
			name: firebaseUser.displayName || '',
			email: firebaseUser.email || '',
			photoURL: firebaseUser.photoURL || '',
			hasValidSubscription,
			creationTime: creationTimestamp, // 使用创建账号的时间戳来决定试用期
		}

		await saveUserData(userData)
		showSuccess(container, userData, hasValidSubscription)
		setTimeout(() => window.close(), 5000)
	} catch (error) {
		showError(container, error.message)
	}
})
