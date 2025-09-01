@echo off
echo ========================================
echo    Tối ưu hóa Project Vocabulary Check
echo ========================================
echo.

echo [1/5] Backup file cũ...
if exist "backend\src\app.js" (
    copy "backend\src\app.js" "backend\src\app-backup.js"
    echo ✓ Đã backup app.js
) else (
    echo ✗ Không tìm thấy app.js
)

echo.
echo [2/5] Cài đặt dependencies tối ưu cho backend...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ✗ Lỗi cài đặt backend dependencies
    pause
    exit /b 1
)
echo ✓ Backend dependencies đã cài đặt

echo.
echo [3/5] Cài đặt dependencies tối ưu cho frontend...
cd ..\frontend\my-react-app
call npm install
if %errorlevel% neq 0 (
    echo ✗ Lỗi cài đặt frontend dependencies
    pause
    exit /b 1
)
echo ✓ Frontend dependencies đã cài đặt

echo.
echo [4/5] Chuyển đổi sang file tối ưu...
cd ..\..\backend\src
if exist "app-optimized.js" (
    if exist "app.js" (
        ren "app.js" "app-old.js"
    )
    ren "app-optimized.js" "app.js"
    echo ✓ Đã chuyển đổi sang file tối ưu
) else (
    echo ✗ Không tìm thấy app-optimized.js
    pause
    exit /b 1
)

echo.
echo [5/5] Kiểm tra cấu trúc thư mục...
cd ..
if exist "src\config" (
    echo ✓ Thư mục config đã tồn tại
) else (
    echo ✗ Thiếu thư mục config
)

if exist "src\services" (
    echo ✓ Thư mục services đã tồn tại
) else (
    echo ✗ Thiếu thư mục services
)

echo.
echo ========================================
echo           HOÀN THÀNH TỐI ƯU HÓA
echo ========================================
echo.
echo ✅ Dependencies đã được tối ưu
echo ✅ Code structure đã được cải thiện
echo ✅ File app.js đã được thay thế
echo.
echo 📋 Để chạy project:
echo    1. cd backend
echo    2. npm run dev
echo.
echo 📋 Để chạy frontend:
echo    1. cd frontend/my-react-app
echo    2. npm run dev
echo.
echo 📋 Nếu có lỗi, có thể khôi phục:
echo    ren app.js app-error.js
echo    ren app-backup.js app.js
echo.
pause
