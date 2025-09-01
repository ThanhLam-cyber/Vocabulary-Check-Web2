@echo off
echo ========================================
echo    Setup Firebase - Frontend
echo ========================================
echo.

echo 📋 Hướng dẫn setup Firebase:
echo.
echo 1. Truy cập: https://console.firebase.google.com/
echo 2. Tạo project mới hoặc chọn project có sẵn
echo 3. Vào Project Settings (⚙️)
echo 4. Scroll xuống "Your apps" và click "Add app"
echo 5. Chọn "Web" (</>) 
echo 6. Đặt tên app và click "Register app"
echo 7. Copy config object
echo.
echo 8. Mở file: frontend/my-react-app/src/firebase/config.js
echo 9. Thay thế firebaseConfig với config thực tế
echo.
echo 10. Enable Firestore Database:
echo    - Vào Firestore Database trong sidebar
echo    - Click "Create database"
echo    - Chọn "Start in test mode"
echo    - Chọn location gần nhất
echo.
echo 11. Chạy development server:
echo    cd frontend/my-react-app
echo    npm run dev
echo.
echo ========================================
echo        FIREBASE SETUP HOÀN THÀNH
echo ========================================
echo.
echo ✅ Firebase config đã được khôi phục về trạng thái ban đầu
echo ✅ App.jsx đã sử dụng Firebase như ban đầu
echo ✅ Các file mock đã được xóa
echo.
echo 📋 Lưu ý:
echo    - Cần cập nhật firebaseConfig với thông tin thực tế
echo    - Cần enable Firestore Database
echo    - App sẽ hoạt động bình thường sau khi setup
echo.
pause
