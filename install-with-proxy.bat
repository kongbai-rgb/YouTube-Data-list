const installScriptWindows = `@echo off
echo ========================================
echo   YouTube AI榜单 - 代理版安装
echo ========================================
echo.

cd backend

echo 检查Node.js版本...
node -v
if %errorlevel% neq 0 (
    echo 错误: 未安装Node.js
    pause
    exit /b 1
)

echo.
echo 设置npm代理（如果需要）...
npm config set proxy http://127.0.0.1:7890
npm config set https-proxy http://127.0.0.1:7890

echo.
echo 安装依赖包...
npm install express cors sqlite3 sqlite axios dotenv https-proxy-agent

echo.
echo 清除npm代理设置...
npm config delete proxy
npm config delete https-proxy

echo.
echo 测试连接...
node test-connection.js

echo.
echo ========================================
echo 安装完成！
echo.
echo 下一步：
echo 1. 确保你的VPN/代理正在运行（端口7890）
echo 2. 运行 npm start 启动服务器
echo ========================================
pause
`;