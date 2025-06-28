const quickStartWindows = `@echo off
echo ========================================
echo   YouTube AI榜单 - 代理模式启动
echo ========================================
echo.

echo 检查代理服务器...
curl -s -o nul -w "代理状态: " http://127.0.0.1:7890
if %errorlevel% equ 0 (
    echo 正常
) else (
    echo 异常
    echo.
    echo 警告: 代理服务器未响应
    echo 请确保你的VPN/代理软件正在运行
    echo.
    pause
)

echo.
cd backend
echo 启动服务器（代理模式）...
echo.
set USE_PROXY=true
set PROXY_URL=http://127.0.0.1:7890
node server.js

pause
`;

console.log('创建的文件列表：');
console.log('1. backend/.env - 环境变量配置');
console.log('2. backend/package.json - 项目依赖');
console.log('3. backend/test-connection.js - 连接测试脚本');
console.log('4. install-with-proxy.bat/sh - 安装脚本');
console.log('5. start-with-proxy.bat - 快速启动脚本');