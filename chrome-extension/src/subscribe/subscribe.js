// subscribe.js

import {
	collection,
	addDoc,
	onSnapshot,
	query,
	where,
	getDocs,
	orderBy,
	limit
} from 'firebase/firestore'
import { db } from '../firebase-init.js'

async function getUserFromStorage() {
	return new Promise(resolve => {
		chrome.storage.sync.get('user', data => {
			resolve(data.user || null)
		})
	})
}

async function hasActiveSubscription(uid) {
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
}

async function createCheckoutSession(uid, priceId, userEmail) {
	const checkoutSessionRef = collection(
		db,
		'customers',
		uid,
		'checkout_sessions'
	)
	const sessionData = {
		price: priceId,
		success_url: 'https://chizhang.love/',
		cancel_url: 'https://example.com/cancel',
		mode: 'subscription',
		metadata: { userId: uid, userEmail }
	}
	return await addDoc(checkoutSessionRef, sessionData)
}

function listenToCheckoutSession(docRef, onData) {
	return onSnapshot(docRef, snap => onData(snap.data()))
}

/** ================== UI Rendering Functions ================== **/
function renderInitialUI(container, user) {
	container.innerHTML = `
	  <h2>Subscribe</h2>
	  <p>Signed in as: ${user.email}</p>
	  <p>Firebase UID: ${user.uid}</p>
	  <button id="subscribeButton">Subscribe Now</button>
	`
}

function renderError(container, message) {
	container.innerHTML = `<h2>Error</h2><p>${message}</p>`
}

function renderAlreadySubscribed(container) {
	container.innerHTML = `
	  <h2>Already Subscribed</h2>
	  <p>You already have an active subscription.</p>
	`
}

// 支付引导页面
function renderPaymentInstructions(container, data, onCancel, onProceed) {
	container.innerHTML = `
	  <h2>Payment Instructions</h2>
	  <p>You will be redirected to the payment page.</p>
	  <p>After completing the payment, please close this window and reopen the extension popup to see updated status.</p>
	  <p>If the status does not update automatically, please log out and log back in manually.</p>
	  <div style="display: flex; gap: 10px; margin-top: 20px;">
		<button id="cancelButton" style="background-color: #dc3545;">Cancel</button>
		<button id="proceedButton" style="background-color: #28a745;">Proceed to Payment</button>
	  </div>
	`
	document
		.getElementById('cancelButton')
		.addEventListener('click', async () => {
			// 用户取消时，刷新用户数据，以确保popup状态同步更新
			await chrome.runtime.sendMessage({ action: 'refreshUser' })
			chrome.runtime.sendMessage({ action: 'notifyPopupToRefresh' })
			onCancel()
		})

	document.getElementById('proceedButton').addEventListener('click', () => {
		// 用户进入stripe支付页面，支付完成后stripe会更新订阅状态
		// 用户关闭此订阅窗口并重新打开popup查看最新状态即可
		window.location.href = data.url
	})
}

function renderRetry(container, message, onRetry) {
	container.innerHTML = `
	  <h2>Error</h2>
	  <p>${message}</p>
	  <button id="retryButton">Try Again</button>
	`
	document.getElementById('retryButton').addEventListener('click', onRetry)
}

/** ================== Main Logic (Event Listeners & Initialization) ================== **/
document.addEventListener('DOMContentLoaded', async () => {
	const container = document.querySelector('.container')
	const PRICE_ID = 'price_1QTjS2DzYvxUqt5ag47kVNwF' // not test mode !

	const user = await getUserFromStorage()
	if (!user || !user.email) {
		renderError(container, 'Please login first before subscribing.')
		return
	}

	renderInitialUI(container, user)
	const subscribeButton = document.getElementById('subscribeButton')

	subscribeButton.addEventListener('click', async () => {
		subscribeButton.disabled = true
		subscribeButton.textContent = 'Checking subscription...'

		const active = await hasActiveSubscription(user.uid)
		if (active) {
			renderAlreadySubscribed(container)
			subscribeButton.disabled = false
			subscribeButton.textContent = 'Subscribe Now'
			return
		}

		subscribeButton.textContent = 'Processing...'
		try {
			const docRef = await createCheckoutSession(user.uid, PRICE_ID, user.email)
			const unsubscribe = listenToCheckoutSession(docRef, data => {
				if (data?.error) {
					renderError(container, data.error.message || 'An error occurred')
					unsubscribe()
				} else if (data?.url) {
					renderPaymentInstructions(
						container,
						data,
						() => {
							// On Cancel，重新渲染初始UI（或简单刷新页面）
							renderInitialUI(container, user)
							document
								.getElementById('subscribeButton')
								.addEventListener('click', () => location.reload())
							unsubscribe()
						},
						() => {
							// onProceed逻辑在renderPaymentInstructions中已完成跳转处理
							unsubscribe()
						}
					)
				}
			})
		} catch (error) {
			console.error('Payment Setup Error:', error)
			renderRetry(container, error.message, () => window.location.reload())
		}
	})
})
