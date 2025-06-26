@echo off
echo ========================================
echo   YouTube AI频道热度榜 启动脚本
echo ========================================
echo.

cd backend

echo 检查Node.js版本...
node -v
if %errorlevel% neq 0 (
    echo 错误: 未安装Node.js，请先安装Node.js
    pause
    exit /b 1
)

echo.
echo 检查依赖安装...
if not exist "node_modules" (
    echo 安装依赖中...
    npm install
)

echo.
echo 检查环境变量配置...
if not exist ".env" (
    echo 错误: 未找到.env文件
    echo 请复制.env.example为.env并配置YouTube API密钥
    pause
    exit /b 1
)

echo.
echo 启动服务器...
echo 访问地址: http://localhost:3000
echo 按 Ctrl+C 停止服务器
echo.

npm run dev

pause