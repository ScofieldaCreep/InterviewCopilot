// firebase-init.js
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth/web-extension'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
	apiKey: 'AIzaSyDnY6QfGkomnyKr6tw3qTsfza1Pr3x2vbk',
	authDomain: 'interviewcopilot-443620.firebaseapp.com',
	projectId: 'interviewcopilot-443620',
	storageBucket: 'interviewcopilot-443620.firebasestorage.app',
	messagingSenderId: '318745197838',
	appId: '1:318745197838:web:7a543cff2bbb25243e6b5f',
	measurementId: 'G-22D270XEHG'
}

const app = initializeApp(firebaseConfig)
const functions = getFunctions(app)
const db = getFirestore(app)
const auth = getAuth(app)

export { auth, db, functions }
