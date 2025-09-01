@echo off
echo ========================================
echo    Fix Help Section
echo ========================================
echo.

echo 🔧 FIXING HELP SECTION:
echo.
echo Vấn đề: Gradient màu cam trong phần "Không biết nói gì?"
echo Giải pháp: Thay thế bằng màu đơn giản
echo.

echo [1/2] Đã xóa gradient text...
echo ✓ bg-gradient-to-r from-amber-500 to-orange-500: Đã xóa
echo ✓ bg-clip-text text-transparent: Đã xóa
echo ✓ Thay thế bằng: text-slate-800 đơn giản
echo.

echo [2/2] Đã xóa gradient icon...
echo ✓ bg-gradient-to-br from-amber-500 to-orange-600: Đã xóa
echo ✓ Thay thế bằng: bg-amber-500 đơn giản
echo.

echo ========================================
echo        HELP SECTION FIXED
echo ========================================
echo.
echo ✅ Gradient text màu cam đã được xóa
echo ✅ Gradient icon màu cam đã được xóa
echo ✅ Text và icon có màu đơn giản
echo ✅ Giao diện sạch sẽ hơn
echo.
echo 📋 Test steps:
echo 1. Mở browser: http://localhost:5173
echo 2. Vào trang "Kiểm tra từ vựng"
echo 3. Trả lời một câu hỏi
echo 4. Kiểm tra phần "Không biết nói gì?"
echo 5. Không còn gradient màu cam
echo.
echo 📋 Các phần đã được sửa:
echo    - Text gradient: bg-gradient-to-r from-amber-500 to-orange-500
echo    - Icon gradient: bg-gradient-to-br from-amber-500 to-orange-600
echo    - Thay thế bằng màu đơn giản
echo.
pause
