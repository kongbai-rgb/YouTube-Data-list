@echo off
echo ========================================
echo   YouTube AI频道热度榜 初始化脚本
echo ========================================
echo.

echo 创建文件夹结构...
mkdir backend\config 2>nul
mkdir backend\controllers 2>nul
mkdir backend\models 2>nul
mkdir backend\services 2>nul
mkdir backend\utils 2>nul
mkdir backend\jobs 2>nul
mkdir backend\database\migrations 2>nul
mkdir backend\database\seeds 2>nul
mkdir frontend\assets\css 2>nul
mkdir frontend\assets\js 2>nul
mkdir frontend\assets\images 2>nul
mkdir frontend\components 2>nul
mkdir logs 2>nul
mkdir scripts 2>nul
mkdir docs 2>nul
mkdir tests\unit 2>nul
mkdir tests\integration 2>nul

echo.
echo 进入backend目录...
cd backend

echo.
echo 初始化npm项目...
if not exist "package.json" (
    npm init -y
)

echo.
echo 安装依赖...
npm install express sqlite3 sqlite node-cron axios dotenv cors helmet morgan compression
npm install googleapis @google-cloud/local-auth
npm install lodash moment dayjs winston express-rate-limit
npm install --save-dev nodemon eslint prettier jest supertest

echo.
echo 创建.env.example文件...
(
echo # YouTube API配置
echo YOUTUBE_API_KEY=your_youtube_api_key_here
echo.
echo # 数据库配置
echo DATABASE_PATH=./database/youtube_ranking.db
echo.
echo # 服务器配置
echo PORT=3000
echo NODE_ENV=development
echo.
echo # API配额配置
echo DAILY_QUOTA_LIMIT=10000
echo QUOTA_WARNING_THRESHOLD=8000
echo.
echo # 定时任务配置
echo ENABLE_CRON_JOBS=true
) > .env.example

echo.
echo 复制.env.example为.env...
copy .env.example .env >nul

echo.
echo ========================================
echo   初始化完成！
echo.
echo 下一步：
echo 1. 编辑 backend\.env 文件，填入你的YouTube API密钥
echo 2. 运行 start.bat 启动服务器
echo ========================================
echo.

pause