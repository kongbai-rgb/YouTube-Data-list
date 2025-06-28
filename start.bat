const startScriptWindows = `@echo off
echo ========================================
echo   YouTube AI榜单 - 快速启动
echo ========================================
echo.

cd backend

REM 检查依赖
if not exist "node_modules" (
    echo 安装依赖...
    call npm install
)

echo.
echo 启动服务器...
echo 浏览器访问: http://localhost:3000
echo.

node server.js
pause
`;

const startScriptUnix = `#!/bin/bash
echo "========================================"
echo "  YouTube AI榜单 - 快速启动"
echo "========================================"
echo ""

cd backend

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

echo ""
echo "启动服务器..."
echo "浏览器访问: http://localhost:3000"
echo ""

node server.js
`;

// 根据操作系统创建启动脚本
if (process.platform === 'win32') {
  fs.writeFileSync(path.join(__dirname, 'start.bat'), startScriptWindows);
  console.log('\n✅ 已创建 start.bat');
} else {
  fs.writeFileSync(path.join(__dirname, 'start.sh'), startScriptUnix);
  fs.chmodSync(path.join(__dirname, 'start.sh'), '755');
  console.log('\n✅ 已创建 start.sh');
}