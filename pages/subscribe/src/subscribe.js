import { collection, addDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from './firebase-init.js'

document.addEventListener('DOMContentLoaded', async function () {
	const container = document.querySelector('.container')

	const PRICE_ID = 'price_1QTIbHDzYvxUqt5a0m0nwUz6' // 替换为你的实际价格ID

	// 从storage获取用户UID，以便创建checkout session
	chrome.storage.sync.get('user', async data => {
		const user = data.user
		if (!user || !user.email) {
			container.innerHTML = `
				<h2>Error</h2>
				<p>Please login first before subscribing.</p>
			`
			return
		}

		container.innerHTML = `
			<h2>Subscribe</h2>
			<p>Signed in as: ${user.email}</p>
			<p>Firebase UID: ${user.uid}</p>
			<button id="subscribeButton">Subscribe Now</button>
		`

		const subscribeButton = document.getElementById('subscribeButton')
		subscribeButton.addEventListener('click', async () => {
			subscribeButton.disabled = true
			subscribeButton.textContent = 'Processing...'

			try {
				// 创建checkout session
				const uid = await getUserUidFromStorage()
				if (!uid) {
					container.innerHTML = `<h2>Error</h2><p>Could not determine user UID.</p>`
					return
				}

				const checkoutSessionRef = collection(
					db,
					'customers',
					uid,
					'checkout_sessions'
				)

				const sessionData = {
					price: PRICE_ID,
					success_url: 'https://example.com/success',
					cancel_url: 'https://example.com/cancel',
					mode: 'payment',
					metadata: {
						userId: uid,
						userEmail: user.email
					}
				}

				const docRef = await addDoc(
					collection(db, 'customers', uid, 'checkout_sessions'),
					sessionData
				)
				const unsubscribe = onSnapshot(docRef, snap => {
					const data = snap.data()
					if (data?.error) {
						console.error('Checkout error:', data.error)
						container.innerHTML = `
							<h2>Error</h2>
							<p>${data.error.message || 'An error occurred'}</p>
						`
						unsubscribe()
					}

					if (data?.url) {
						container.innerHTML = `
							<h2>Payment Instructions</h2>
							<p>You will be redirected to the payment page.</p>
							<p>After completing the payment, please close this window and open the extension again to see your payment status.</p>
							<div style="display: flex; gap: 10px; margin-top: 20px;">
								<button id="cancelButton" style="background-color: #dc3545;">Cancel</button>
								<button id="proceedButton" style="background-color: #28a745;">Proceed to Payment</button>
							</div>
						`

						const cancelButton = document.getElementById('cancelButton')
						cancelButton.addEventListener('click', () => {
							// 回到订阅按钮界面
							container.innerHTML = `
								<h2>Subscribe</h2>
								<p>Signed in as: ${user.email}</p>
								<button id="subscribeButton">Subscribe Now</button>
							`
							const newSubscribeButton =
								document.getElementById('subscribeButton')
							newSubscribeButton.addEventListener('click', () =>
								location.reload()
							)
							unsubscribe()
						})

						const proceedButton = document.getElementById('proceedButton')
						proceedButton.addEventListener('click', () => {
							window.location.href = data.url
						})

						unsubscribe()
					}
				})
			} catch (error) {
				console.error('Payment Setup Error:', error)
				container.innerHTML = `
					<h2>Error</h2>
					<p>Failed to setup payment: ${error.message}</p>
					<button id="retryButton">Try Again</button>
				`
				const retryButton = document.getElementById('retryButton')
				retryButton.addEventListener('click', () => {
					window.location.reload()
				})
			}
		})
	})

	async function getUserUidFromStorage() {
		return new Promise(resolve => {
			chrome.storage.sync.get('user', data => {
				if (data.user && data.user.email) {
					// 在login.js中是通过firebase认证获取的userCredential.user.uid保存的uid吗？
					// 确保login.js中也把uid保存下来：
					// chrome.storage.sync.set({ user: { ..., uid: user.uid } })
					// 然后这里就可以通过data.user.uid来获取了。
					resolve(data.user.uid || null)
				} else {
					resolve(null)
				}
			})
		})
	}
})
