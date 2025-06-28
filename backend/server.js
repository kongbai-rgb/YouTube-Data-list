// ===== 文件位置: backend/server.js =====
// 支持代理的增强版服务器

const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// API配置
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'AIzaSyBa4HftrclnGNjRRCUCCEnnI4hF3hZdUWo';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// 代理配置 - 根据你的VPN设置
const PROXY_URL = process.env.PROXY_URL || 'http://127.0.0.1:7890'; // 使用你的mixed-port
const USE_PROXY = process.env.USE_PROXY === 'true' || true; // 默认启用代理

// 创建axios实例（带代理）
let youtubeApi;
if (USE_PROXY) {
  console.log(`🌐 使用代理: ${PROXY_URL}`);
  const proxyAgent = new HttpsProxyAgent(PROXY_URL);
  
  youtubeApi = axios.create({
    baseURL: YOUTUBE_API_BASE,
    timeout: 30000,
    params: {
      key: YOUTUBE_API_KEY
    },
    httpsAgent: proxyAgent,
    proxy: false // 重要：禁用axios的默认代理设置
  });
} else {
  console.log('📡 直接连接（不使用代理）');
  youtubeApi = axios.create({
    baseURL: YOUTUBE_API_BASE,
    timeout: 30000,
    params: {
      key: YOUTUBE_API_KEY
    }
  });
}

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// 配额管理
const quotaManager = {
  used: 0,
  limit: 10000,
  warningThreshold: 8000,
  
  recordUsage(units) {
    this.used += units;
    if (this.used >= this.warningThreshold) {
      console.warn(`⚠️ API配额警告: 已使用 ${this.used}/${this.limit} 单位`);
    }
    return this.used;
  },
  
  hasQuota(requiredUnits = 1) {
    return (this.used + requiredUnits) <= this.limit;
  },
  
  getRemaining() {
    return this.limit - this.used;
  }
};

// 数据库连接
async function getDb() {
  const dbPath = path.join(__dirname, 'database', 'youtube_ranking.db');
  const fs = require('fs');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

// 初始化数据库
async function initDatabase() {
  try {
    const db = await getDb();
    
    await db.exec(`
      CREATE TABLE IF NOT EXISTS channels (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        subscriber_count INTEGER,
        video_count INTEGER,
        is_active BOOLEAN DEFAULT 1,
        added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_updated DATETIME
      );

      CREATE TABLE IF NOT EXISTS videos (
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
      );

      CREATE TABLE IF NOT EXISTS video_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT NOT NULL,
        view_count INTEGER,
        like_count INTEGER,
        comment_count INTEGER,
        captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos(id)
      );

      CREATE TABLE IF NOT EXISTS daily_rankings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id TEXT NOT NULL,
        rank_type TEXT NOT NULL,
        rank_position INTEGER,
        heat_score DECIMAL(10,2),
        view_increment INTEGER,
        ranking_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_id) REFERENCES videos(id)
      );
    `);
    
    // 插入默认AI频道
    const defaultChannels = [
      { id: 'UCbfYPyITQ-7l4upoX8nvctg', name: 'Two Minute Papers' },
      { id: 'UCq6VFHwMzcMXbuKyG7SQYIg', name: 'Matt Wolfe' },
      { id: 'UCMLtBahI5DMrt0NPvDSoIRQ', name: 'Yannic Kilcher' },
      { id: 'UC8butISFwT-Wl7EV0hUK0BQ', name: 'freeCodeCamp.org' },
      { id: 'UCfzlCWGWYyIQ0aLC5w48gBQ', name: 'Sentdex' }
    ];
    
    for (const channel of defaultChannels) {
      await db.run(
        'INSERT OR IGNORE INTO channels (id, name) VALUES (?, ?)',
        [channel.id, channel.name]
      );
    }
    
    await db.close();
    console.log('✅ 数据库初始化完成');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
  }
}

// ===== API路由 =====

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    apiKey: YOUTUBE_API_KEY ? '已配置' : '未配置',
    proxy: USE_PROXY ? `已启用 (${PROXY_URL})` : '未启用',
    quotaRemaining: quotaManager.getRemaining()
  });
});

// 测试YouTube API连接（带代理）
app.get('/api/test-youtube', async (req, res) => {
  try {
    console.log('测试YouTube API连接...');
    
    const response = await youtubeApi.get('/videos', {
      params: {
        part: 'snippet',
        id: 'dQw4w9WgXcQ'
      }
    });
    
    res.json({
      success: true,
      message: 'YouTube API连接正常',
      proxy: USE_PROXY ? `通过代理 ${PROXY_URL}` : '直接连接',
      data: response.data
    });
  } catch (error) {
    console.error('YouTube API测试失败:', error.message);
    res.json({
      success: false,
      error: error.message,
      proxy: USE_PROXY ? `代理: ${PROXY_URL}` : '未使用代理',
      suggestion: USE_PROXY ? '检查代理设置' : '尝试启用代理'
    });
  }
});

// 获取统计信息
app.get('/api/stats', async (req, res) => {
  try {
    const db = await getDb();
    const stats = await db.get(`
      SELECT 
        (SELECT COUNT(*) FROM channels WHERE is_active = 1) as active_channels,
        (SELECT COUNT(*) FROM videos) as total_videos,
        (SELECT COUNT(*) FROM videos WHERE is_short = 1) as total_shorts,
        (SELECT COUNT(*) FROM videos WHERE is_short = 0) as total_long_videos,
        (SELECT COUNT(*) FROM daily_rankings WHERE ranking_date = date('now')) as today_rankings
    `);
    await db.close();
    
    res.json({
      success: true,
      stats: {
        active_channels: stats?.active_channels || 0,
        total_videos: stats?.total_videos || 0,
        total_shorts: stats?.total_shorts || 0,
        total_long_videos: stats?.total_long_videos || 0,
        today_rankings: stats?.today_rankings || 0,
        api_quota_used: quotaManager.used,
        api_quota_remaining: quotaManager.getRemaining()
      }
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.json({
      success: true,
      stats: {
        active_channels: 0,
        total_videos: 0,
        total_shorts: 0,
        total_long_videos: 0,
        today_rankings: 0,
        api_quota_used: quotaManager.used,
        api_quota_remaining: quotaManager.getRemaining()
      }
    });
  }
});

// 搜索AI频道
app.get('/api/search/channels', async (req, res) => {
  try {
    const { q = 'AI machine learning', pageToken } = req.query;
    
    if (!quotaManager.hasQuota(100)) {
      return res.status(429).json({ 
        success: false, 
        error: 'API配额不足',
        remaining: quotaManager.getRemaining() 
      });
    }
    
    console.log('搜索AI频道，关键词:', q);
    
    const response = await youtubeApi.get('/search', {
      params: {
        part: 'snippet',
        q: q,
        type: 'channel',
        maxResults: 10,
        regionCode: 'US',
        relevanceLanguage: 'en',
        pageToken: pageToken
      }
    });
    
    quotaManager.recordUsage(100);
    
    const channels = [];
    const db = await getDb();
    const existingChannels = await db.all('SELECT id FROM channels');
    const existingIds = new Set(existingChannels.map(ch => ch.id));
    await db.close();
    
    // 处理搜索结果
    for (const item of response.data.items) {
      const channelId = item.snippet.channelId;
      const channelTitle = item.snippet.channelTitle;
      const description = item.snippet.description;
      
      // AI相关性检查
      const aiKeywords = ['AI', 'artificial intelligence', 'machine learning', 'deep learning', 
                         'neural', 'GPT', 'data science', 'computer vision', 'NLP', 'ChatGPT', 
                         'LLM', 'transformer', 'tensorflow', 'pytorch'];
      const isAIRelated = aiKeywords.some(keyword => 
        (channelTitle + ' ' + description).toLowerCase().includes(keyword.toLowerCase())
      );
      
      channels.push({
        id: channelId,
        name: channelTitle,
        description: description,
        thumbnails: item.snippet.thumbnails,
        isAIRelated: isAIRelated,
        isAdded: existingIds.has(channelId)
      });
    }
    
    res.json({
      success: true,
      channels: channels,
      nextPageToken: response.data.nextPageToken,
      totalResults: response.data.pageInfo?.totalResults,
      quotaUsed: 100,
      quotaRemaining: quotaManager.getRemaining()
    });
    
  } catch (error) {
    console.error('搜索频道失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '搜索失败: ' + error.message,
      proxy: USE_PROXY ? `使用代理: ${PROXY_URL}` : '未使用代理'
    });
  }
});

// 添加频道
app.post('/api/channels/add', async (req, res) => {
  try {
    const { channelId, channelName } = req.body;
    
    if (!channelId || !channelName) {
      return res.status(400).json({ 
        success: false, 
        error: '缺少必要参数' 
      });
    }
    
    const db = await getDb();
    
    const existing = await db.get('SELECT id FROM channels WHERE id = ?', channelId);
    if (existing) {
      await db.close();
      return res.json({ 
        success: false, 
        error: '频道已存在' 
      });
    }
    
    await db.run(
      'INSERT INTO channels (id, name, is_active) VALUES (?, ?, 1)',
      [channelId, channelName]
    );
    
    await db.close();
    
    console.log(`✅ 添加频道: ${channelName} (${channelId})`);
    
    res.json({ 
      success: true, 
      message: '频道添加成功',
      channel: { id: channelId, name: channelName }
    });
    
  } catch (error) {
    console.error('添加频道失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '添加失败: ' + error.message 
    });
  }
});

// 获取频道列表
app.get('/api/channels', async (req, res) => {
  try {
    const db = await getDb();
    const channels = await db.all('SELECT * FROM channels WHERE is_active = 1 ORDER BY name');
    await db.close();
    
    res.json({
      success: true,
      channels: channels
    });
  } catch (error) {
    console.error('获取频道列表失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取失败: ' + error.message 
    });
  }
});

// 获取视频数据
app.post('/api/fetch/videos', async (req, res) => {
  try {
    console.log('开始获取视频数据...');
    
    if (!quotaManager.hasQuota(500)) {
      return res.status(429).json({ 
        success: false, 
        error: 'API配额不足',
        remaining: quotaManager.getRemaining() 
      });
    }
    
    const db = await getDb();
    const channels = await db.all('SELECT * FROM channels WHERE is_active = 1 LIMIT 5');
    
    let totalVideos = 0;
    let errors = [];
    
    for (const channel of channels) {
      try {
        console.log(`获取频道视频: ${channel.name}`);
        
        // 获取频道信息
        const channelResponse = await youtubeApi.get('/channels', {
          params: {
            part: 'contentDetails',
            id: channel.id
          }
        });
        
        quotaManager.recordUsage(1);
        
        if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
          console.log(`频道 ${channel.name} 未找到`);
          continue;
        }
        
        const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;
        
        // 获取最近的视频
        const videosResponse = await youtubeApi.get('/playlistItems', {
          params: {
            part: 'contentDetails',
            playlistId: uploadsPlaylistId,
            maxResults: 5
          }
        });
        
        quotaManager.recordUsage(1);
        
        const videoIds = videosResponse.data.items.map(item => item.contentDetails.videoId);
        
        if (videoIds.length > 0) {
          // 获取视频详情
          const videoDetailsResponse = await youtubeApi.get('/videos', {
            params: {
              part: 'snippet,statistics,contentDetails',
              id: videoIds.join(',')
            }
          });
          
          quotaManager.recordUsage(1);
          
          // 保存视频数据
          for (const video of videoDetailsResponse.data.items) {
            const duration = parseDuration(video.contentDetails.duration);
            const isShort = duration <= 60;
            
            await db.run(`
              INSERT OR REPLACE INTO videos (
                id, channel_id, title, description, duration, is_short, 
                published_at, thumbnail_url
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              video.id,
              channel.id,
              video.snippet.title,
              video.snippet.description || '',
              duration,
              isShort ? 1 : 0,
              video.snippet.publishedAt,
              video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url
            ]);
            
            await db.run(`
              INSERT INTO video_stats (
                video_id, view_count, like_count, comment_count
              ) VALUES (?, ?, ?, ?)
            `, [
              video.id,
              parseInt(video.statistics.viewCount) || 0,
              parseInt(video.statistics.likeCount) || 0,
              parseInt(video.statistics.commentCount) || 0
            ]);
            
            totalVideos++;
          }
        }
        
        // 添加延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`获取频道 ${channel.name} 视频失败:`, error.message);
        errors.push(`${channel.name}: ${error.message}`);
      }
    }
    
    // 生成榜单
    await generateRankings(db);
    
    await db.close();
    
    console.log(`✅ 获取完成，共获取 ${totalVideos} 个视频`);
    
    res.json({
      success: true,
      message: `成功获取 ${totalVideos} 个视频`,
      errors: errors.length > 0 ? errors : undefined,
      quotaUsed: quotaManager.used,
      quotaRemaining: quotaManager.getRemaining()
    });
    
  } catch (error) {
    console.error('获取视频失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取失败: ' + error.message 
    });
  }
});

// 获取榜单
app.get('/api/rankings/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { date } = req.query;
    
    if (!['shorts', 'long', 'all'].includes(type)) {
      return res.status(400).json({ error: '无效的榜单类型' });
    }
    
    const db = await getDb();
    const queryDate = date || new Date().toISOString().split('T')[0];
    
    let sql = `
      SELECT 
        dr.*,
        v.id as video_id,
        v.title,
        v.thumbnail_url as thumbnail,
        v.duration,
        v.published_at,
        c.name as channel_name,
        c.id as channel_id,
        COALESCE(vs.view_count, 0) as view_count,
        COALESCE(vs.like_count, 0) as like_count,
        COALESCE(vs.comment_count, 0) as comment_count
      FROM daily_rankings dr
      JOIN videos v ON dr.video_id = v.id
      JOIN channels c ON v.channel_id = c.id
      LEFT JOIN (
        SELECT video_id, view_count, like_count, comment_count
        FROM video_stats
        WHERE id IN (SELECT MAX(id) FROM video_stats GROUP BY video_id)
      ) vs ON vs.video_id = v.id
      WHERE dr.ranking_date = ?
    `;
    
    if (type !== 'all') {
      sql += ` AND dr.rank_type = ?`;
    }
    
    sql += ` ORDER BY dr.rank_position LIMIT 50`;
    
    const params = type === 'all' ? [queryDate] : [queryDate, type];
    const rankings = await db.all(sql, params);
    
    await db.close();
    
    res.json({
      success: true,
      type,
      date: queryDate,
      count: rankings.length,
      rankings
    });
    
  } catch (error) {
    console.error('获取榜单失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取失败: ' + error.message 
    });
  }
});

// 生成榜单
async function generateRankings(db) {
  console.log('生成榜单...');
  
  const today = new Date().toISOString().split('T')[0];
  
  await db.run('DELETE FROM daily_rankings WHERE ranking_date = ?', today);
  
  const videos = await db.all(`
    SELECT 
      v.*,
      vs.view_count,
      vs.like_count,
      vs.comment_count,
      vs.view_count as heat_score
    FROM videos v
    LEFT JOIN video_stats vs ON v.id = vs.video_id
    WHERE vs.id IN (
      SELECT MAX(id) FROM video_stats GROUP BY video_id
    )
    ORDER BY vs.view_count DESC
  `);
  
  const shorts = videos.filter(v => v.is_short);
  const longVideos = videos.filter(v => !v.is_short);
  
  // 保存Shorts榜单
  for (let i = 0; i < Math.min(50, shorts.length); i++) {
    await db.run(`
      INSERT INTO daily_rankings (
        video_id, rank_type, rank_position, heat_score, 
        view_increment, ranking_date
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      shorts[i].id,
      'shorts',
      i + 1,
      shorts[i].heat_score,
      Math.floor(shorts[i].view_count * 0.1),
      today
    ]);
  }
  
  // 保存长视频榜单
  for (let i = 0; i < Math.min(50, longVideos.length); i++) {
    await db.run(`
      INSERT INTO daily_rankings (
        video_id, rank_type, rank_position, heat_score, 
        view_increment, ranking_date
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      longVideos[i].id,
      'long',
      i + 1,
      longVideos[i].heat_score,
      Math.floor(longVideos[i].view_count * 0.1),
      today
    ]);
  }
  
  console.log(`✅ 榜单生成完成: Shorts ${shorts.length} 个, 长视频 ${longVideos.length} 个`);
}

// 解析YouTube时长
function parseDuration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  return hours * 3600 + minutes * 60 + seconds;
}

// 启动服务器
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 服务器启动成功！`);
    console.log(`📡 API地址: http://localhost:${PORT}`);
    console.log(`🌐 网页地址: http://localhost:${PORT}`);
    console.log(`🔌 代理状态: ${USE_PROXY ? `已启用 (${PROXY_URL})` : '未启用'}`);
    console.log(`\n💡 使用提示:`);
    console.log(`  1. 访问 /api/test-youtube 测试YouTube连接`);
    console.log(`  2. 访问 /api/health 查看系统状态`);
    console.log(`  3. 如果连接失败，检查代理是否正常运行`);
  });
}).catch(console.error);