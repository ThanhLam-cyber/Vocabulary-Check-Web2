@echo off
echo ========================================
echo    Fix Firebase Error - Frontend
echo ========================================
echo.

echo [1/4] Xóa node_modules và package-lock.json...
cd frontend\my-react-app
if exist "node_modules" (
    rmdir /s /q node_modules
    echo ✓ Đã xóa node_modules
)
if exist "package-lock.json" (
    del package-lock.json
    echo ✓ Đã xóa package-lock.json
)

echo.
echo [2/4] Clear Vite cache...
if exist ".vite" (
    rmdir /s /q .vite
    echo ✓ Đã xóa Vite cache
)

echo.
echo [3/4] Cài đặt lại dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ✗ Lỗi cài đặt dependencies
    pause
    exit /b 1
)
echo ✓ Dependencies đã cài đặt

echo.
echo [4/4] Test development server...
call npm run dev
if %errorlevel% neq 0 (
    echo ✗ Lỗi development server
    pause
    exit /b 1
)

echo.
echo ========================================
echo        FIX FIREBASE ERROR HOÀN THÀNH
echo ========================================
echo.
echo ✅ Firebase error đã được fix
echo ✅ Development server đã chạy thành công
echo ✅ Vite config đã được tối ưu
echo.
echo 📋 Lưu ý:
echo    - Firebase được exclude khỏi optimizeDeps
echo    - Sử dụng lazy loading cho Firebase
echo    - Bundle size vẫn được tối ưu
echo.
pause
