// 文件位置: scripts/quickfix.js
// 快速修复常见问题的脚本

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

console.log('🔧 YouTube-Data-list 快速修复脚本');
console.log('=====================================\n');

// 修复1: 创建必要的文件夹
function createDirectories() {
  console.log('📁 创建必要的文件夹...');
  const dirs = [
    'backend/config',
    'backend/services',
    'backend/jobs',
    'backend/utils',
    'backend/database',
    'frontend',
    'logs',
    'scripts'
  ];
  
  dirs.forEach(dir => {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`  ✅ 创建: ${dir}`);
    }
  });
}

// 修复2: 创建.env文件
function createEnvFile() {
  console.log('\n📝 创建环境变量文件...');
  const envPath = path.join(__dirname, '..', 'backend', '.env');
  
  if (!fs.existsSync(envPath)) {
    const envContent = `# YouTube API配置
YOUTUBE_API_KEY=AIzaSyBa4HftrclnGNjRRCUCCEnnI4hF3hZdUWo

# 数据库配置
DATABASE_PATH=./database/youtube_ranking.db

# 服务器配置
PORT=3000
NODE_ENV=development

# API配额配置
DAILY_QUOTA_LIMIT=10000
QUOTA_WARNING_THRESHOLD=8000

# 定时任务配置
ENABLE_CRON_JOBS=true
FETCH_INTERVAL_HOURS=1
STATS_UPDATE_INTERVAL_HOURS=4
RANKING_GENERATION_HOUR=2

# 日志配置
LOG_LEVEL=info
LOG_FILE_PATH=../logs/app.log

# 缓存配置
CACHE_TTL_SECONDS=3600

# CORS配置
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5000
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('  ✅ 创建 .env 文件');
  } else {
    console.log('  ℹ️ .env 文件已存在');
  }
}

// 修复3: 初始化数据库
async function initDatabase() {
  console.log('\n💾 初始化数据库...');
  const dbPath = path.join(__dirname, '..', 'backend', 'database', 'youtube_ranking.db');
  
  const db = new sqlite3.Database(dbPath);
  
  const tables = [
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
    )`,
    
    `CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      log_type TEXT,
      message TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ];
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      tables.forEach((sql, index) => {
        db.run(sql, (err) => {
          if (err) {
            console.error(`  ❌ 创建表失败: ${err.message}`);
          } else {
            console.log(`  ✅ 创建表 ${index + 1}/${tables.length}`);
          }
        });
      });
      
      // 创建索引
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_videos_channel ON videos(channel_id)',
        'CREATE INDEX IF NOT EXISTS idx_video_stats_video ON video_stats(video_id)',
        'CREATE INDEX IF NOT EXISTS idx_video_stats_captured ON video_stats(captured_at)',
        'CREATE INDEX IF NOT EXISTS idx_rankings_date ON daily_rankings(ranking_date)',
        'CREATE INDEX IF NOT EXISTS idx_rankings_type ON daily_rankings(rank_type)'
      ];
      
      indexes.forEach(sql => {
        db.run(sql);
      });
      
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

// 修复4: 插入初始频道数据
async function seedChannels() {
  console.log('\n📺 插入初始频道数据...');
  const dbPath = path.join(__dirname, '..', 'backend', 'database', 'youtube_ranking.db');
  const db = new sqlite3.Database(dbPath);
  
  const channels = [
    { id: "UCbfYPyITQ-7l4upoX8nvctg", name: "Two Minute Papers" },
    { id: "UCgBfm4GdqLzWJXP2bIQ5y8Q", name: "AI Explained" },
    { id: "UCMLtBahI5DMrt0NPvDSoIRQ", name: "Yannic Kilcher" },
    { id: "UC8butISFwT-Wl7EV0hUK0BQ", name: "freeCodeCamp.org" },
    { id: "UCfzlCWGWYyIQ0aLC5w48gBQ", name: "Sentdex" }
  ];
  
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      const stmt = db.prepare("INSERT OR IGNORE INTO channels (id, name, is_active) VALUES (?, ?, 1)");
      
      channels.forEach(channel => {
        stmt.run(channel.id, channel.name, (err) => {
          if (err) {
            console.error(`  ❌ 插入频道失败 ${channel.name}: ${err.message}`);
          } else {
            console.log(`  ✅ 插入频道: ${channel.name}`);
          }
        });
      });
      
      stmt.finalize();
      db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

// 修复5: 创建package.json
function createPackageJson() {
  console.log('\n📦 检查package.json...');
  const packagePath = path.join(__dirname, '..', 'backend', 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    const packageContent = {
      "name": "youtube-ai-ranking-backend",
      "version": "1.0.0",
      "description": "YouTube AI频道数据榜单后端服务",
      "main": "server.js",
      "scripts": {
        "start": "node server.js",
        "dev": "nodemon server.js",
        "setup": "node ../scripts/setup.js",
        "job:fetch": "node jobs/fetchNewVideos.js",
        "job:stats": "node jobs/updateVideoStats.js",
        "job:ranking": "node jobs/generateRankings.js"
      }
    };
    
    fs.writeFileSync(packagePath, JSON.stringify(packageContent, null, 2));
    console.log('  ✅ 创建 package.json');
  } else {
    console.log('  ℹ️ package.json 已存在');
  }
}

// 主函数
async function main() {
  try {
    createDirectories();
    createEnvFile();
    createPackageJson();
    await initDatabase();
    await seedChannels();
    
    console.log('\n🎉 修复完成！');
    console.log('\n下一步操作：');
    console.log('1. cd backend');
    console.log('2. npm install (安装依赖)');
    console.log('3. npm run dev (启动服务器)');
    console.log('\n⚠️  警告：请尽快更换API密钥，当前密钥已公开暴露！');
    
  } catch (error) {
    console.error('\n❌ 修复过程中出错:', error.message);
  }
}

// 执行修复
main();