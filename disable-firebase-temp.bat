@echo off
echo ========================================
echo    Disable Firebase - Temporary
echo ========================================
echo.

echo [1/3] Backup current Firebase config...
if exist "frontend\my-react-app\src\firebase\config.js" (
    copy "frontend\my-react-app\src\firebase\config.js" "frontend\my-react-app\src\firebase\config-backup.js"
    echo ✓ Đã backup Firebase config
) else (
    echo ✗ Không tìm thấy Firebase config
)

echo.
echo [2/3] Tạo Firebase config với mock services...
cd frontend\my-react-app\src\firebase

echo // Firebase configuration with mock services > config-mock.js
echo import { initializeApp } from 'firebase/app' >> config-mock.js
echo import { getAuth } from 'firebase/auth' >> config-mock.js
echo import { getFirestore } from 'firebase/firestore' >> config-mock.js
echo. >> config-mock.js
echo // Mock Firebase config >> config-mock.js
echo const firebaseConfig = { >> config-mock.js
echo   apiKey: "mock-api-key", >> config-mock.js
echo   authDomain: "mock-project.firebaseapp.com", >> config-mock.js
echo   projectId: "mock-project", >> config-mock.js
echo   storageBucket: "mock-project.appspot.com", >> config-mock.js
echo   messagingSenderId: "123456789", >> config-mock.js
echo   appId: "1:123456789:web:mock123" >> config-mock.js
echo } >> config-mock.js
echo. >> config-mock.js
echo // Initialize Firebase with mock services >> config-mock.js
echo let app >> config-mock.js
echo let auth >> config-mock.js
echo let db >> config-mock.js
echo. >> config-mock.js
echo try { >> config-mock.js
echo   app = initializeApp(firebaseConfig) >> config-mock.js
echo   auth = getAuth(app) >> config-mock.js
echo   db = getFirestore(app) >> config-mock.js
echo   console.log('Firebase initialized successfully') >> config-mock.js
echo } catch (error) { >> config-mock.js
echo   console.error('Firebase initialization error:', error) >> config-mock.js
echo   // Create mock Firebase services to prevent crashes >> config-mock.js
echo   app = { name: 'mock-app', options: firebaseConfig } >> config-mock.js
echo   auth = { currentUser: null, onAuthStateChanged: () => {}, signInAnonymously: async () => ({ user: { uid: 'mock-user' } }) } >> config-mock.js
echo   db = { >> config-mock.js
echo     collection: (collectionName) => ({ >> config-mock.js
echo       addDoc: async (data) => { >> config-mock.js
echo         console.log(`Mock Firestore - Adding to ${collectionName}:`, data) >> config-mock.js
echo         return { id: `mock-${Date.now()}` } >> config-mock.js
echo       }, >> config-mock.js
echo       getDocs: async () => ({ docs: [], forEach: () => {}, empty: true }), >> config-mock.js
echo       onSnapshot: () => () => {} >> config-mock.js
echo     }) >> config-mock.js
echo   } >> config-mock.js
echo } >> config-mock.js
echo. >> config-mock.js
echo export { auth, db } >> config-mock.js
echo export default app >> config-mock.js

echo ✓ Đã tạo Firebase config với mock services

echo.
echo [3/3] Thay thế Firebase config...
if exist "config-mock.js" (
    ren "config.js" "config-real.js"
    ren "config-mock.js" "config.js"
    echo ✓ Đã thay thế Firebase config
) else (
    echo ✗ Không tạo được config-mock.js
)

echo.
echo ========================================
echo        DISABLE FIREBASE HOÀN THÀNH
echo ========================================
echo.
echo ✅ Firebase đã được disable tạm thời
echo ✅ Sử dụng mock services để tránh lỗi
echo ✅ Không còn lỗi Firebase connection
echo.
echo 📋 Để khôi phục Firebase thực tế:
echo    ren config.js config-mock.js
echo    ren config-real.js config.js
echo    Cập nhật config với thông tin thực tế
echo.
echo 📋 Để chạy development server:
echo    cd frontend/my-react-app
echo    npm run dev
echo.
pause
