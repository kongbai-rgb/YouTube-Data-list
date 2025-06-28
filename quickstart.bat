@echo off
REM ===== 快速启动脚本 =====
REM 文件名: quickstart.bat
REM 放在项目根目录（D:\YouTube Data list\）

echo ========================================
echo   YouTube AI榜单 - 快速启动
echo ========================================
echo.

REM 检查Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到Node.js，请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] 检查Node.js... OK
echo.

REM 创建必要的目录
echo [2/5] 创建目录结构...
if not exist "backend" mkdir backend
if not exist "backend\config" mkdir backend\config
if not exist "backend\services" mkdir backend\services
if not exist "backend\database" mkdir backend\database
if not exist "backend\utils" mkdir backend\utils
if not exist "frontend" mkdir frontend
if not exist "logs" mkdir logs
echo       目录创建完成
echo.

REM 检查package.json
echo [3/5] 检查项目配置...
if not exist "package.json" (
    echo       创建package.json...
    (
        echo {
        echo   "name": "youtube-ai-ranking",
        echo   "version": "1.0.0",
        echo   "scripts": {
        echo     "start": "node backend/server.js"
        echo   },
        echo   "dependencies": {
        echo     "express": "^4.18.2",
        echo     "cors": "^2.8.5",
        echo     "sqlite3": "^5.1.6",
        echo     "sqlite": "^5.1.1"
        echo   }
        echo }
    ) > package.json
)
echo       配置文件就绪
echo.

REM 安装依赖
echo [4/5] 安装依赖包...
if not exist "node_modules" (
    echo       首次运行，正在安装依赖...
    call npm install
) else (
    echo       依赖已安装
)
echo.

REM 启动服务器
echo [5/5] 启动服务器...
echo.
echo ========================================
echo   服务器正在启动...
echo   
echo   网址: http://localhost:3000
echo   
echo   按 Ctrl+C 停止服务器
echo ========================================
echo.

node backend/server.js

pause