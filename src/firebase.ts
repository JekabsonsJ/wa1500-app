import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCMvBjnyJea7DDMz3wU2rV0nqm_gcnj6Bc",
  authDomain: "wa1500-app.firebaseapp.com",
  projectId: "wa1500-app",
  storageBucket: "wa1500-app.firebasestorage.app",
  messagingSenderId: "74048255489",
  appId: "1:74048255489:web:3cd601f8ed7e5400f73200"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)