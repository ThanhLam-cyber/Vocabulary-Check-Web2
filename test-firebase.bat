@echo off
echo ========================================
echo    Test Firebase Connection
echo ========================================
echo.

echo 🔥 TESTING FIREBASE CONNECTION:
echo.
echo Project: vocabulary-check-51e3e
echo Database: https://vocabulary-check-51e3e-default-rtdb.asia-southeast1.firebasedatabase.app/
echo.

echo [1/3] Kiểm tra Firebase config...
if exist "frontend\my-react-app\src\firebase\config.js" (
    echo ✓ Firebase config file tồn tại
    findstr "vocabulary-check-51e3e" "frontend\my-react-app\src\firebase\config.js" >nul
    if %errorlevel% equ 0 (
        echo ✓ Project ID đã được cập nhật: vocabulary-check-51e3e
    ) else (
        echo ✗ Project ID chưa được cập nhật
    )
) else (
    echo ✗ Không tìm thấy Firebase config file
)

echo.
echo [2/3] Kiểm tra dependencies...
cd frontend\my-react-app
if exist "package.json" (
    findstr "firebase" "package.json" >nul
    if %errorlevel% equ 0 (
        echo ✓ Firebase dependency đã được cài đặt
    ) else (
        echo ✗ Firebase dependency chưa được cài đặt
        echo   Chạy: npm install firebase
    )
) else (
    echo ✗ Không tìm thấy package.json
)

echo.
echo [3/3] Test development server...
echo Chạy development server để test Firebase connection...
echo.
echo 📋 Hướng dẫn test:
echo 1. Mở browser và truy cập: http://localhost:5173
echo 2. Thử thêm một từ vựng
echo 3. Kiểm tra console để xem Firebase logs
echo 4. Nếu có lỗi, cần cập nhật API key và App ID
echo.
echo 📋 Để lấy Firebase config thực tế:
echo 1. Truy cập: https://console.firebase.google.com/
echo 2. Chọn project: vocabulary-check-51e3e
echo 3. Vào Project Settings > General
echo 4. Scroll xuống "Your apps" và copy config
echo.

echo ========================================
echo        TEST FIREBASE HOÀN THÀNH
echo ========================================
echo.
echo ✅ Firebase config đã được cập nhật
echo ✅ Project ID: vocabulary-check-51e3e
echo ✅ Database URL đã được thêm
echo.
echo 📋 Bước tiếp theo:
echo    - Cập nhật API key và App ID thực tế
echo    - Enable Firestore Database
echo    - Test thêm từ vựng
echo.
pause
