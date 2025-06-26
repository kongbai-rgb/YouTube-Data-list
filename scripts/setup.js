const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

console.log('🚀 开始初始化YouTube AI榜单项目...');

// 创建必要的文件
const filesToCreate = [
  'backend/config/channels.js',
  'backend/config/database.js',
  'backend/config/youtube.js',
  'backend/app.js',
  'backend/server.js',
  'frontend/index.html',
  'frontend/assets/css/styles.css',
  'frontend/assets/js/app.js',
  'README.md',
  '.gitignore'
];

filesToCreate.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '// TODO: 实现此文件\n');
    console.log(`✅ 创建文件: ${file}`);
  }
});

// 初始化数据库
const dbPath = path.join(__dirname, '..', 'backend', 'database', 'youtube_ranking.db');
const db = new sqlite3.Database(dbPath);

console.log('📊 初始化数据库...');

const createTableQueries = [
  `CREATE TABLE IF NOT EXISTS channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    subscriber_count INTEGER,
    video_count INTEGER,
    is_active BOOLEAN DEFAULT 1,
    added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_updated DATETIME
  )`,
  
  `CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER,
    is_short BOOLEAN,
    published_at DATETIME,
    thumbnail_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id)
  )`,
  
  `CREATE TABLE IF NOT EXISTS video_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    view_count INTEGER,
    like_count INTEGER,
    comment_count INTEGER,
    captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id)
  )`,
  
  `CREATE TABLE IF NOT EXISTS daily_rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL,
    rank_type TEXT NOT NULL,
    rank_position INTEGER,
    heat_score DECIMAL(10,2),
    view_increment INTEGER,
    ranking_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id)
  )`
];

db.serialize(() => {
  createTableQueries.forEach(query => {
    db.run(query);
  });
  console.log('✅ 数据库表创建完成');
});

db.close();

// 创建.gitignore文件内容
const gitignoreContent = `
# 依赖
node_modules/
package-lock.json

# 环境变量
.env
.env.local
.env.*.local

# 日志
logs/
*.log

# 数据库
*.db
*.sqlite

# 系统文件
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.sublime-*

# 构建输出
dist/
build/
`;

fs.writeFileSync(path.join(__dirname, '..', '.gitignore'), gitignoreContent);

console.log('🎉 项目初始化完成！');
console.log('\n下一步:');
console.log('1. 在 backend/.env 文件中配置你的 YouTube API 密钥');
console.log('2. 运行 npm run seed 来添加初始频道数据');
console.log('3. 运行 npm run dev 启动开发服务器');