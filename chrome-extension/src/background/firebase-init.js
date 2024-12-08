// firebase-init.js
import { initializeApp } from 'firebase/app'
import { getFunctions } from 'firebase/functions'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
	apiKey: 'AIzaSyDnY6Q...',
	authDomain: 'interviewcopilot-443620.firebaseapp.com',
	projectId: 'interviewcopilot-443620',
	storageBucket: 'interviewcopilot-443620.firebasestorage.app',
	messagingSenderId: '318745197838',
	appId: '1:318745197838:web:7a543cff2bbb25243e6b5f',
	measurementId: 'G-22D270XEHG'
}

const app = initializeApp(firebaseConfig)
// 在此处指定函数调用区域
const functions = getFunctions(app, 'us-central1')
const db = getFirestore(app)
const auth = getAuth(app)

export { db, auth, functions }
