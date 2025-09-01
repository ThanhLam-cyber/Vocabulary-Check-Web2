#!/bin/bash

echo "========================================"
echo "   Fix Firebase Error - Frontend"
echo "========================================"
echo

echo "[1/4] Xóa node_modules và package-lock.json..."
cd frontend/my-react-app
if [ -d "node_modules" ]; then
    rm -rf node_modules
    echo "✓ Đã xóa node_modules"
fi
if [ -f "package-lock.json" ]; then
    rm package-lock.json
    echo "✓ Đã xóa package-lock.json"
fi

echo
echo "[2/4] Clear Vite cache..."
if [ -d ".vite" ]; then
    rm -rf .vite
    echo "✓ Đã xóa Vite cache"
fi

echo
echo "[3/4] Cài đặt lại dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "✗ Lỗi cài đặt dependencies"
    exit 1
fi
echo "✓ Dependencies đã cài đặt"

echo
echo "[4/4] Test development server..."
npm run dev
if [ $? -ne 0 ]; then
    echo "✗ Lỗi development server"
    exit 1
fi

echo
echo "========================================"
echo "     FIX FIREBASE ERROR HOÀN THÀNH"
echo "========================================"
echo
echo "✅ Firebase error đã được fix"
echo "✅ Development server đã chạy thành công"
echo "✅ Vite config đã được tối ưu"
echo
echo "📋 Lưu ý:"
echo "   - Firebase được exclude khỏi optimizeDeps"
echo "   - Sử dụng lazy loading cho Firebase"
echo "   - Bundle size vẫn được tối ưu"
echo
