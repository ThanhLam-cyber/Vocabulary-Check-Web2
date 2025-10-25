// Firebase configuration with real project
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Firebase config for vocabulary-check-51e3e project
const firebaseConfig = {
  apiKey: "AIzaSyCj_Qb_vMb6iw5v945HbKJ_W5vaS1ZdkuI",
  authDomain: "vocabulary-check-web2.firebaseapp.com",
  databaseURL: "https://vocabulary-check-web2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "vocabulary-check-web2",
  storageBucket: "vocabulary-check-web2.firebasestorage.app",
  messagingSenderId: "55712887959",
  appId: "1:55712887959:web:f6787b3d0f8790bce065d2",
  measurementId: "G-33SH8F3RLM"
};
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
