// Firebase configuration with real project
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase config for vocabulary-check-51e3e project
const firebaseConfig = {
  apiKey: "AIzaSyYourApiKey", // Cần thay thế bằng API key thực tế
  authDomain: "vocabulary-check-51e3e.firebaseapp.com",
  projectId: "vocabulary-check-51e3e",
  storageBucket: "vocabulary-check-51e3e.appspot.com",
  messagingSenderId: "your-messaging-sender-id", // Cần thay thế
  appId: "your-app-id", // Cần thay thế
  databaseURL: "https://vocabulary-check-51e3e-default-rtdb.asia-southeast1.firebasedatabase.app/"
}

// Initialize Firebase with error handling
let app
let auth
let db

try {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  console.log('Firebase initialized successfully with project: vocabulary-check-51e3e')
} catch (error) {
  console.error('Firebase initialization error:', error)
  
  // Create mock Firebase services to prevent crashes
  app = {
    name: 'mock-app',
    options: firebaseConfig
  }
  
  auth = {
    currentUser: null,
    onAuthStateChanged: () => () => {},
    signInAnonymously: async () => ({ user: { uid: 'mock-user' } })
  }
  
  db = {
    collection: (collectionName) => ({
      addDoc: async (data) => {
        console.log(`Mock Firestore - Adding to ${collectionName}:`, data)
        return { id: `mock-${Date.now()}` }
      },
      getDocs: async () => ({
        docs: [],
        forEach: () => {},
        empty: true
      }),
      onSnapshot: () => () => {}
    })
  }
}

export { auth, db }
export default app
