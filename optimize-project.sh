#!/bin/bash

echo "========================================"
echo "   Tối ưu hóa Project Vocabulary Check"
echo "========================================"
echo

echo "[1/5] Backup file cũ..."
if [ -f "backend/src/app.js" ]; then
    cp "backend/src/app.js" "backend/src/app-backup.js"
    echo "✓ Đã backup app.js"
else
    echo "✗ Không tìm thấy app.js"
fi

echo
echo "[2/5] Cài đặt dependencies tối ưu cho backend..."
cd backend
npm install
if [ $? -ne 0 ]; then
    echo "✗ Lỗi cài đặt backend dependencies"
    exit 1
fi
echo "✓ Backend dependencies đã cài đặt"

echo
echo "[3/5] Cài đặt dependencies tối ưu cho frontend..."
cd ../frontend/my-react-app
npm install
if [ $? -ne 0 ]; then
    echo "✗ Lỗi cài đặt frontend dependencies"
    exit 1
fi
echo "✓ Frontend dependencies đã cài đặt"

echo
echo "[4/5] Chuyển đổi sang file tối ưu..."
cd ../../backend/src
if [ -f "app-optimized.js" ]; then
    if [ -f "app.js" ]; then
        mv "app.js" "app-old.js"
    fi
    mv "app-optimized.js" "app.js"
    echo "✓ Đã chuyển đổi sang file tối ưu"
else
    echo "✗ Không tìm thấy app-optimized.js"
    exit 1
fi

echo
echo "[5/5] Kiểm tra cấu trúc thư mục..."
cd ..
if [ -d "src/config" ]; then
    echo "✓ Thư mục config đã tồn tại"
else
    echo "✗ Thiếu thư mục config"
fi

if [ -d "src/services" ]; then
    echo "✓ Thư mục services đã tồn tại"
else
    echo "✗ Thiếu thư mục services"
fi

echo
echo "========================================"
echo "         HOÀN THÀNH TỐI ƯU HÓA"
echo "========================================"
echo
echo "✅ Dependencies đã được tối ưu"
echo "✅ Code structure đã được cải thiện"
echo "✅ File app.js đã được thay thế"
echo
echo "📋 Để chạy project:"
echo "   1. cd backend"
echo "   2. npm run dev"
echo
echo "📋 Để chạy frontend:"
echo "   1. cd frontend/my-react-app"
echo "   2. npm run dev"
echo
echo "📋 Nếu có lỗi, có thể khôi phục:"
echo "   mv app.js app-error.js"
echo "   mv app-backup.js app.js"
echo
