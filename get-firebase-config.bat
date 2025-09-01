@echo off
echo ========================================
echo    Get Firebase Config - Real Project
echo ========================================
echo.

echo 🔥 HƯỚNG DẪN LẤY FIREBASE CONFIG THỰC TẾ:
echo.
echo Project ID của bạn: vocabulary-check-51e3e
echo Database URL: https://vocabulary-check-51e3e-default-rtdb.asia-southeast1.firebasedatabase.app/
echo.
echo 1. Truy cập: https://console.firebase.google.com/
echo 2. Chọn project: vocabulary-check-51e3e
echo 3. Vào Project Settings (⚙️)
echo 4. Scroll xuống "Your apps" 
echo 5. Nếu chưa có app web, click "Add app" và chọn "Web" (</>)
echo 6. Nếu đã có app web, click vào app đó
echo 7. Copy toàn bộ config object
echo.
echo 8. Mở file: frontend/my-react-app/src/firebase/config.js
echo 9. Thay thế firebaseConfig với config thực tế
echo.
echo 10. Enable Firestore Database (nếu chưa):
echo    - Vào Firestore Database trong sidebar
echo    - Click "Create database"
echo    - Chọn "Start in test mode"
echo    - Chọn location: asia-southeast1
echo.
echo 11. Chạy development server:
echo    cd frontend/my-react-app
echo    npm run dev
echo.
echo ========================================
echo        FIREBASE CONFIG HOÀN THÀNH
echo ========================================
echo.
echo ✅ Project ID đã được cập nhật: vocabulary-check-51e3e
echo ✅ Database URL đã được thêm
echo ✅ Cần cập nhật API key và App ID thực tế
echo.
echo 📋 Lưu ý:
echo    - API key và App ID cần được lấy từ Firebase Console
echo    - Firestore Database cần được enable
echo    - App sẽ hoạt động bình thường sau khi setup
echo.
pause
